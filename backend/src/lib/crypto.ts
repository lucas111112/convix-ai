import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Hash a token using SHA-256.
 * Used for storing refresh tokens securely.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically secure random token of the given byte length.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function getKey(): Buffer {
  return Buffer.from(env.CHANNEL_ENCRYPTION_KEY, 'hex');
}

/**
 * Encrypt a credentials object to a base64 string using AES-256-GCM.
 * Format: iv(12) + ciphertext + authTag(16), all base64-encoded.
 */
export function encryptCredentials(credentials: Record<string, string>): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, authTag]).toString('base64');
}

/**
 * Decrypt a base64-encoded AES-256-GCM blob back to a credentials object.
 */
export function decryptCredentials(blob: string): Record<string, string> {
  const key = getKey();
  const buf = Buffer.from(blob, 'base64');

  const iv = buf.subarray(0, IV_BYTES);
  const authTag = buf.subarray(buf.length - AUTH_TAG_BYTES);
  const ciphertext = buf.subarray(IV_BYTES, buf.length - AUTH_TAG_BYTES);

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}
