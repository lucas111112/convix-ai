import crypto from 'crypto';
import { openai } from '../../config/openai';
import { redis } from '../../config/redis';
import { logger } from '../../lib/logger';

function textHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function embed(text: string): Promise<number[]> {
  const cacheKey = `emb:${textHash(text)}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as number[];
    }
  } catch (err) {
    logger.warn({ err }, 'Redis cache miss for embedding (non-fatal)');
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-004',
    input: text.slice(0, 8000), // token limit safety
  });

  const embedding = response.data[0].embedding;

  try {
    await redis.setex(cacheKey, 86400, JSON.stringify(embedding)); // 24h
  } catch (err) {
    logger.warn({ err }, 'Failed to cache embedding (non-fatal)');
  }

  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: 'text-embedding-004',
      input: batch.map((t) => t.slice(0, 8000)),
    });
    results.push(...response.data.map((d) => d.embedding));
  }

  return results;
}
