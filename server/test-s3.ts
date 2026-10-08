import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});

async function run() {
  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    console.log('Bucket:', bucket);
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: 'test-upload-' + Date.now() + '.txt',
      Body: 'Hello world',
    });
    
    const res = await s3.send(command);
    console.log('Success:', res);
  } catch (err) {
    console.error('AWS S3 Error:', err);
  }
}
run();
