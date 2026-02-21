# Knowledge Base & Ingestion

Knowledge sources are the documents, URLs, Q&As, and other content that an agent uses to answer questions accurately. This system handles ingesting them, chunking them, embedding them, and making them searchable via vector similarity.

## Source Types

| Type | Input | How It's Processed |
|---|---|---|
| `TEXT` | Raw text string | Split into chunks directly |
| `URL` | A single URL | Fetch HTML → extract text → chunk |
| `PDF` | S3/R2 storage key | Download → extract text with `pdf-parse` → chunk |
| `QA` | Q&A pairs (text) | Each Q&A pair = one chunk |
| `YOUTUBE` | YouTube video URL | Fetch transcript via YouTube API → chunk |
| `SITEMAP` | Sitemap XML URL | Crawl all URLs → extract text from each → chunk |

---

## Ingestion Pipeline

Ingestion is asynchronous. When a doc is created via `POST /v1/agents/:id/knowledge`, a BullMQ job is enqueued and the response returns `{ status: "PENDING" }` immediately.

```
Create KnowledgeDoc → status: PENDING
         │
         ▼
  Enqueue ingestion job
         │
         ▼
  Worker picks up job
         │
         ▼
  1. Set status = PROCESSING
         │
         ▼
  2. Fetch/extract raw text
         │
         ▼
  3. Chunk text
         │
         ▼
  4. Embed each chunk (batched)
         │
         ▼
  5. Upsert KnowledgeChunk rows (with embedding vector)
         │
         ▼
  6. Set status = READY, chunkCount = N
         │
  (on error)
         ▼
  Set status = ERROR, errorMsg = "..."
```

---

## Chunking Strategy

```ts
function chunkText(text: string, options = { chunkSize: 512, overlap: 64 }): string[] {
  const { chunkSize, overlap } = options;
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 20) {  // skip trivially small chunks
      chunks.push(chunk);
    }
  }

  return chunks;
}
```

### Chunk sizes by type

| Type | Chunk size (words) | Overlap |
|---|---|---|
| TEXT | 512 | 64 |
| URL | 400 | 50 |
| PDF | 512 | 64 |
| QA | 1 pair per chunk | 0 |
| YOUTUBE | 300 | 40 |
| SITEMAP | 400 | 50 |

Q&A pairs are never split — each pair is one chunk to preserve the Q→A relationship.

---

## Embedding Batch

OpenAI's `text-embedding-3-small` model accepts up to 2048 inputs in one call. We batch our chunks:

```ts
async function embedChunks(chunks: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });
    results.push(...response.data.map(d => d.embedding));
  }

  return results;
}
```

---

## Individual Ingestors

### URL Ingestor

```ts
async function ingestUrl(sourceUrl: string): Promise<string> {
  const response = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'AxonAI/1.0' },
    signal: AbortSignal.timeout(10_000),
  });
  const html = await response.text();

  // Strip HTML tags, preserve meaningful whitespace
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{3,}/g, '\n\n')
    .trim();

  return text;
}
```

### PDF Ingestor

```ts
import pdfParse from 'pdf-parse';

async function ingestPdf(storageKey: string): Promise<string> {
  const buffer = await StorageService.download(storageKey);
  const data = await pdfParse(buffer);
  return data.text;
}
```

### YouTube Ingestor

```ts
async function ingestYoutube(videoUrl: string): Promise<string> {
  const videoId = extractYouTubeId(videoUrl);

  // Use YouTube's unofficial transcript API (or a library like 'youtube-transcript')
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);

  return transcript.map(seg => seg.text).join(' ');
}
```

### Sitemap Ingestor

```ts
async function ingestSitemap(sitemapUrl: string): Promise<string> {
  const xml = await fetch(sitemapUrl).then(r => r.text());
  const urls = parseSitemapXml(xml);  // extract <loc> tags

  // Crawl up to 50 URLs (limit to avoid massive token/credit cost)
  const pages = await Promise.allSettled(
    urls.slice(0, 50).map(url => ingestUrl(url))
  );

  return pages
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<string>).value)
    .join('\n\n---\n\n');
}
```

---

## Presigned Upload URL (for PDFs)

The frontend gets a presigned URL, uploads directly to R2, then POSTs the storage key to the knowledge endpoint.

```
Frontend → POST /v1/storage/presign
  Body: { filename: "guide.pdf", contentType: "application/pdf" }
  Response: { uploadUrl: "https://...", storageKey: "uploads/ws_abc/abc123.pdf" }

Frontend → PUT {uploadUrl} with file data

Frontend → POST /v1/agents/:id/knowledge
  Body: { type: "PDF", title: "User Guide", storageKey: "uploads/ws_abc/abc123.pdf" }
```

---

## Deletion & Re-indexing

When a `KnowledgeDoc` is deleted, all its `KnowledgeChunk` rows are cascade-deleted (including vectors). Re-indexing simply deletes all chunks and re-runs ingestion.

```ts
async function reindexDoc(docId: string): Promise<void> {
  await prisma.knowledgeChunk.deleteMany({ where: { docId } });
  await prisma.knowledgeDoc.update({
    where: { id: docId },
    data: { status: 'PENDING', chunkCount: 0, errorMsg: null },
  });
  await ingestionQueue.add('ingest', { docId });
}
```

---

## Vector Search Threshold

The cosine similarity threshold of `0.78` filters out weakly-related chunks. This value is tunable per workspace in the future. At threshold 0.78:

- Score 0.95+ = nearly exact match
- Score 0.85–0.94 = highly relevant
- Score 0.78–0.84 = relevant but broad
- Score < 0.78 = ignored

If no chunks score above the threshold, the AI answers from its general knowledge (system prompt only). This is intentional — it's better to say "I don't have information on that" than to hallucinate.

---

## Status Polling

The frontend polls for ingestion completion:

```
GET /v1/agents/:agentId/knowledge
Response includes status per doc: PENDING | PROCESSING | READY | ERROR
```

Typical ingestion times:
- TEXT: < 5 seconds
- URL: 5–15 seconds
- PDF (10 pages): 10–30 seconds
- YouTube (30 min video): 15–45 seconds
- Sitemap (50 pages): 60–120 seconds
