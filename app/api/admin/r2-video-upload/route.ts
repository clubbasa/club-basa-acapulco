import { NextResponse } from 'next/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;

function safeSegment(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'sin-categoria';
}
function safeFilename(value: string) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleaned = normalized.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
  return cleaned.slice(0, 140) || 'video.mp4';
}
function getS3Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) throw new Error('R2 server credentials are not configured.');

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // AWS SDK v3.729+ automatically adds CRC32 checksums to S3 uploads.
    // For browser uploads through an R2 presigned URL, that produces
    // checksum query parameters that are not needed here and can cause
    // the browser/R2 CORS preflight to fail. Only calculate a checksum
    // when the operation explicitly requires one.
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const decoded = await getAdminAuth().verifyIdToken(token);
    const adminDoc = await getAdminDb().collection('admins').doc(decoded.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.enabled !== true) return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });

    const body = await request.json();
    const filename = String(body.filename || '');
    const contentType = String(body.contentType || '');
    const size = Number(body.size || 0);
    const categorySlug = safeSegment(String(body.categorySlug || ''));
    const productId = safeSegment(String(body.productId || ''));
    if (!filename || !productId) return NextResponse.json({ error: 'Faltan datos del video.' }, { status: 400 });
    if (!contentType.startsWith('video/')) return NextResponse.json({ error: 'Solo se permiten archivos de video.' }, { status: 400 });
    if (!Number.isFinite(size) || size <= 0 || size > MAX_VIDEO_SIZE) return NextResponse.json({ error: 'El video debe pesar más de 0 y como máximo 1 GB.' }, { status: 400 });

    const bucket = process.env.R2_BUCKET_NAME || 'club-basa-videos';
    const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || 'https://media.club-basa.com').replace(/\/$/, '');
    const key = `videos/${categorySlug}/${productId}/${crypto.randomUUID()}-${safeFilename(filename)}`;
    const uploadUrl = await getSignedUrl(
      getS3Client(),
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      { expiresIn: 900 },
    );

    return NextResponse.json({ uploadUrl, key, publicUrl: `${publicBaseUrl}/${key}`, expiresIn: 900, contentType, size });
  } catch (error) {
    console.error('R2 upload URL error:', error);
    return NextResponse.json({ error: 'No se pudo preparar la subida a Cloudflare R2.' }, { status: 500 });
  }
}
