import { S3Client } from '@aws-sdk/client-s3';

export function r2Client() {
  const a = process.env.R2_ACCOUNT_ID;
  const k = process.env.R2_ACCESS_KEY_ID;
  const s = process.env.R2_SECRET_ACCESS_KEY;
  if (!a || !k || !s) throw new Error('R2 server credentials are not configured.');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${a}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: k, secretAccessKey: s },
  });
}

export const r2Bucket = () => process.env.R2_BUCKET_NAME || 'club-basa-v2';
export const r2PublicUrl = () => (process.env.R2_PUBLIC_BASE_URL || 'https://media.club-basa.com').replace(/\/$/, '');
