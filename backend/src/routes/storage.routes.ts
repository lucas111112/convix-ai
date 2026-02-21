import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { authenticate } from '../middleware/authenticate';
import { requireWorkspace } from '../middleware/requireWorkspace';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

const router = Router();

function buildS3Client(): S3Client {
  if (!env.S3_BUCKET || !env.S3_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new AppError('S3_NOT_CONFIGURED', 501, 'File storage (S3/R2) is not configured on this server');
  }
  return new S3Client({
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// POST /v1/storage/presign – return a presigned upload URL
router.post(
  '/presign',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename, contentType } = req.body;
      if (!filename || !contentType) {
        throw new AppError('VALIDATION_ERROR', 400, 'filename and contentType are required');
      }

      const ext = filename.split('.').pop();
      const storageKey = `uploads/${(req as any).workspace.id}/${uuidv4()}.${ext}`;

      const s3 = buildS3Client();
      const command = new PutObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: storageKey,
        ContentType: contentType,
      });

      // URL valid for 15 minutes
      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

      res.json({ uploadUrl, storageKey });
    } catch (err) {
      next(err);
    }
  },
);

export { router as storageRouter };
