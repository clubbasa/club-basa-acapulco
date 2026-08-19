import { NextResponse } from 'next/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const requestSchema = z.object({
  fileName: z.string().min(1).max(240),
  contentType: z.string().min(1).max(160),
  size: z.number().int().positive().max(2 * 1024 * 1024 * 1024),
});

const allowedVideoTypes = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/mpeg',
  'video/ogg',
]);

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Faltan las credenciales de Cloudflare R2.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function safeFileName(value: string) {
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '') || 'video.mp4';
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const idToken = authorization.slice('Bearer '.length).trim();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const adminSnap = await adminDb.doc(`admins/${decoded.uid}`).get();

    if (!adminSnap.exists || adminSnap.data()?.enabled !== true) {
      return NextResponse.json({ error: 'Sin permisos de administrador.' }, { status: 403 });
    }

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos de video inválidos.' }, { status: 400 });
    }

    const { fileName, contentType, size } = parsed.data;
    if (!allowedVideoTypes.has(contentType)) {
      return NextResponse.json({ error: 'Formato de video no permitido. Usa MP4, WebM, MOV, MKV, MPEG u OGG.' }, { status: 400 });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || 'https://media.club-basa.com';
    if (!bucket) throw new Error('Falta R2_BUCKET_NAME.');

    const key = `videos/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFileName(fileName)}`;
    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    const publicUrl = `${publicBaseUrl.replace(/\/$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`;

    return NextResponse.json({ uploadUrl, key, publicUrl, size, expiresIn: 900 });
  } catch (error) {
    console.error('R2 upload-url error:', error);
    return NextResponse.json({ error: 'No se pudo preparar la carga en Cloudflare R2.' }, { status: 500 });
  }
}
