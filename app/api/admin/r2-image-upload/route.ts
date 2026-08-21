import { NextResponse } from 'next/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
]);
const ALLOWED_FOLDERS = new Set(['products', 'promotions']);

function safeSegment(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'producto';
}

function safeFilename(value: string) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalized.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 140) || 'imagen';
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
    const productId = safeSegment(String(body.productId || ''));
    const folder = ALLOWED_FOLDERS.has(String(body.folder)) ? String(body.folder) : 'products';

    if (!filename || !productId) return NextResponse.json({ error: 'Faltan datos de la imagen.' }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) return NextResponse.json({ error: 'Formato de imagen no permitido. Usa JPG, PNG, WEBP, AVIF, HEIC o HEIF.' }, { status: 400 });
    if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_SIZE) return NextResponse.json({ error: 'La imagen debe pesar más de 0 y como máximo 15 MB.' }, { status: 400 });

    const bucket = process.env.R2_BUCKET_NAME || 'club-basa-videos';
    const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || 'https://media.club-basa.com').replace(/\/$/, '');
    const key = `images/${folder}/${productId}/${crypto.randomUUID()}-${safeFilename(filename)}`;
    const uploadUrl = await getSignedUrl(
      getS3Client(),
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      { expiresIn: 900 },
    );

    return NextResponse.json({ uploadUrl, key, publicUrl: `${publicBaseUrl}/${key}`, expiresIn: 900, contentType, size });
  } catch (error) {
    console.error('R2 image upload URL error:', error);
    return NextResponse.json({ error: 'No se pudo preparar la subida de la imagen a Cloudflare R2.' }, { status: 500 });
  }
}
