import { Worker, Job } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/prisma';
import { logger } from '../../lib/logger';
import { captureException } from '../../lib/sentry';
import { socketService } from '../../services/realtime/socket.service';

// These will be provided by the knowledge ingestion agent
import {
  extractText,
  chunkText,
  getChunkOptions,
  embedChunks,
} from '../../services/knowledge/ingestion/ingestor';

interface IngestionJobData {
  docId: string;
}

const connection = redis as unknown as ConnectionOptions;

const ingestionWorker = new Worker<IngestionJobData>(
  'ingestion',
  async (job: Job<IngestionJobData>) => {
    const { docId } = job.data;

    const doc = await prisma.knowledgeDoc.findUniqueOrThrow({ where: { id: docId } });

    await prisma.knowledgeDoc.update({
      where: { id: docId },
      data: { status: 'PROCESSING' },
    });

    try {
      // 1. Extract raw text
      const text = await extractText(doc as any);

      // 2. Chunk with type-specific options
      const chunkOptions = getChunkOptions(doc.type as any);
      const chunks = chunkText(text, chunkOptions);

      // 3. Embed in batches
      const embeddings = await embedChunks(chunks);

      // 4. Delete old chunks if re-indexing, then insert new ones
      await prisma.knowledgeChunk.deleteMany({ where: { docId } });

      // Use raw SQL for vector insertion
      for (let i = 0; i < chunks.length; i++) {
        const embeddingStr = `[${embeddings[i].join(',')}]`;
        await prisma.$executeRaw`
          INSERT INTO knowledge_chunks (id, doc_id, content, embedding, chunk_idx, created_at)
          VALUES (
            gen_random_uuid()::text,
            ${docId},
            ${chunks[i]},
            ${embeddingStr}::vector,
            ${i},
            NOW()
          )
        `;
      }

      await prisma.knowledgeDoc.update({
        where: { id: docId },
        data: { status: 'READY', chunkCount: chunks.length, errorMsg: null },
      });

      // Emit status to dashboard
      const updatedDoc = await prisma.knowledgeDoc.findUnique({ where: { id: docId } });
      if (updatedDoc) {
        socketService.emitToWorkspace(updatedDoc.workspaceId, 'knowledge_ready', {
          docId,
          chunkCount: chunks.length,
        });
      }

      logger.info({ docId, chunkCount: chunks.length }, 'Ingestion complete');
    } catch (err) {
      logger.error({ err, docId }, 'Ingestion failed');
      await prisma.knowledgeDoc.update({
        where: { id: docId },
        data: { status: 'ERROR', errorMsg: String(err) },
      });
      throw err; // BullMQ will retry
    }
  },
  { connection, concurrency: 3 },
);

ingestionWorker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Ingestion job failed');
  await captureException(err, { jobId: job?.id, data: job?.data });
});

ingestionWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Ingestion job completed');
});

export { ingestionWorker };
