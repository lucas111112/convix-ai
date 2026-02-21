import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import * as cheerio from 'cheerio';
import { YoutubeTranscript } from 'youtube-transcript';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { openai } from '../../../config/openai';
import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';
import { AppError } from '../../../lib/errors';

// ─────────────────────────────────────────────────────────────────
// Types (matching Prisma enums)
// ─────────────────────────────────────────────────────────────────

type KnowledgeType = 'TEXT' | 'URL' | 'PDF' | 'QA' | 'YOUTUBE' | 'SITEMAP';

interface KnowledgeDoc {
  id: string;
  type: KnowledgeType;
  rawContent?: string | null;
  sourceUrl?: string | null;
  storageKey?: string | null;
  title: string;
}

// ─────────────────────────────────────────────────────────────────
// Text extraction
// ─────────────────────────────────────────────────────────────────

export async function extractText(doc: KnowledgeDoc): Promise<string> {
  switch (doc.type) {
    case 'TEXT':
    case 'QA':
      return doc.rawContent ?? '';

    case 'URL':
      return fetchAndExtractUrl(doc.sourceUrl!);

    case 'PDF':
      return fetchAndParsePdf(doc.storageKey!);

    case 'YOUTUBE':
      return fetchYoutubeTranscript(doc.sourceUrl!);

    case 'SITEMAP':
      return crawlSitemap(doc.sourceUrl!);

    default:
      throw new AppError('UNSUPPORTED_DOC_TYPE', 422, `Unsupported knowledge doc type: ${doc.type}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Chunking
// ─────────────────────────────────────────────────────────────────

export function chunkText(
  text: string,
  options?: { chunkSize?: number; overlap?: number },
): string[] {
  const chunkSize = options?.chunkSize ?? 512;
  const overlap = options?.overlap ?? 64;

  if (!text || text.trim().length === 0) return [];

  // Split into words
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const slice = words.slice(i, i + chunkSize);
    const chunk = slice.join(' ').trim();

    if (chunk.length >= 20) {
      chunks.push(chunk);
    }

    // Advance by (chunkSize - overlap)
    const advance = Math.max(1, chunkSize - overlap);
    i += advance;
  }

  return chunks;
}

export function getChunkOptions(type: KnowledgeType): { chunkSize: number; overlap: number } {
  switch (type) {
    case 'TEXT':
    case 'PDF':
      return { chunkSize: 512, overlap: 64 };
    case 'URL':
    case 'SITEMAP':
      return { chunkSize: 400, overlap: 50 };
    case 'YOUTUBE':
      return { chunkSize: 300, overlap: 40 };
    case 'QA':
      return { chunkSize: 9999, overlap: 0 }; // Each QA pair is one chunk
    default:
      return { chunkSize: 512, overlap: 64 };
  }
}

// ─────────────────────────────────────────────────────────────────
// Embedding
// ─────────────────────────────────────────────────────────────────

export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch.map((t) => t.slice(0, 8000)),
    });

    results.push(...response.data.map((d) => d.embedding));
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────
// Internal: URL fetch + HTML strip
// ─────────────────────────────────────────────────────────────────

async function fetchAndExtractUrl(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'AxonAI-Bot/1.0 (knowledge ingestion)' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    throw new AppError('URL_FETCH_FAILED', 502, `Failed to fetch ${url}: HTTP ${resp.status}`);
  }

  const html = await resp.text();
  return extractTextFromHtml(html);
}

function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove noise elements
  $('script, style, nav, footer, header, aside, noscript, iframe, svg').remove();
  $('[class*="cookie"], [class*="popup"], [class*="banner"], [id*="cookie"]').remove();

  // Prefer main content areas
  const contentEl =
    $('article').first() ||
    $('main').first() ||
    $('[role="main"]').first() ||
    $('body');

  const text = contentEl.text();

  return text
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─────────────────────────────────────────────────────────────────
// Internal: PDF parse
// ─────────────────────────────────────────────────────────────────

async function fetchAndParsePdf(storageKey: string): Promise<string> {
  const buffer = await downloadStorage(storageKey);
  const parsed = await pdfParse(buffer);
  return parsed.text;
}

/**
 * Download from storage. Supports HTTP URLs, S3/R2 storage keys, and local filesystem paths (dev).
 */
async function downloadStorage(storageKey: string): Promise<Buffer> {
  // HTTP/HTTPS URL – fetch directly
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
    const resp = await fetch(storageKey, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      throw new AppError('STORAGE_FETCH_FAILED', 502, `Failed to download from ${storageKey}: ${resp.status}`);
    }
    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // S3 / R2 storage key (e.g. uploads/workspace-id/uuid.pdf)
  if (env.S3_BUCKET && env.S3_REGION && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
    const s3 = new S3Client({
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const response = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: storageKey }));

    if (!response.Body) {
      throw new AppError('STORAGE_READ_FAILED', 500, `Empty S3 response body for key: ${storageKey}`);
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  // Local filesystem path (dev / test fallback)
  const resolvedPath = path.resolve(storageKey);
  try {
    return fs.readFileSync(resolvedPath);
  } catch (err: any) {
    throw new AppError('STORAGE_READ_FAILED', 500, `Failed to read file at ${resolvedPath}: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Internal: YouTube transcript
// ─────────────────────────────────────────────────────────────────

async function fetchYoutubeTranscript(url: string): Promise<string> {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) {
    throw new AppError('INVALID_YOUTUBE_URL', 422, `Could not extract video ID from URL: ${url}`);
  }

  const segments = await YoutubeTranscript.fetchTranscript(videoId);

  return segments
    .map((s) => s.text)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // raw video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────
// Internal: Sitemap crawl
// ─────────────────────────────────────────────────────────────────

async function crawlSitemap(sitemapUrl: string): Promise<string> {
  const resp = await fetch(sitemapUrl, {
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    throw new AppError('SITEMAP_FETCH_FAILED', 502, `Failed to fetch sitemap ${sitemapUrl}: ${resp.status}`);
  }

  const xml = await resp.text();
  const $ = cheerio.load(xml, { xmlMode: true });

  // Extract <loc> URLs
  const urls: string[] = [];
  $('loc').each((_, el) => {
    const loc = $(el).text().trim();
    if (loc) urls.push(loc);
  });

  if (urls.length === 0) {
    throw new AppError('EMPTY_SITEMAP', 422, `No URLs found in sitemap: ${sitemapUrl}`);
  }

  // Crawl up to 50 URLs concurrently in batches
  const MAX_URLS = 50;
  const CONCURRENCY = 10;
  const targetUrls = urls.slice(0, MAX_URLS);

  logger.info({ total: urls.length, crawling: targetUrls.length, sitemapUrl }, 'Crawling sitemap URLs');

  const textParts: string[] = [];

  for (let i = 0; i < targetUrls.length; i += CONCURRENCY) {
    const batch = targetUrls.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((u) => fetchAndExtractUrl(u)));

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        textParts.push(result.value);
      } else if (result.status === 'rejected') {
        logger.warn({ err: result.reason }, 'Sitemap URL crawl failed (skipping)');
      }
    }
  }

  return textParts.join('\n\n');
}
