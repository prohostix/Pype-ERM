import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import { Request } from 'express';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});

const ALLOWED_EXTENSIONS = new Set(['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv']);

const storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET_NAME || 'my-bucket',
  metadata: function (req: Request, file: Express.Multer.File, cb: (error: any, metadata?: any) => void) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req: Request, file: Express.Multer.File, cb: (error: any, key?: string) => void) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    try {
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname || '').toLowerCase());
    } catch (err) {
      cb(err as Error, '');
    }
  }
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check ONLY the extension — the mimetype from client headers is untrusted
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }
  cb(new Error(`Invalid file type '${ext}'. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`));
};

export const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter,
});

