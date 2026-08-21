import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

// Only page/section visits are persisted here — no IP address, user agent,
// or auth/session data is ever stored. Values are matched against fixed
// allow-lists so clients can't create arbitrary counter buckets.
const ALLOWED_PAGES = new Set(['/', '/blog', '/blog/panquecitos-acapulco', '/blog/menu-club-basa', '/blog/envios-acapulco']);
const ALLOWED_AREAS = new Set(['beneficios', 'menu', 'envios', 'testimonios', 'compartir', 'faq', 'contacto']);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.event) return NextResponse.json({ ok: false }, { status: 400 });

  const path = body.data?.path;
  const area = body.data?.area;

  try {
    if (body.event === 'page_view' && typeof path === 'string' && ALLOWED_PAGES.has(path)) {
      await getAdminDb().collection('analytics').add({ type: 'page_view', key: `page:${path}`, ts: FieldValue.serverTimestamp() });
    } else if (body.event === 'section_view' && typeof area === 'string' && ALLOWED_AREAS.has(area)) {
      await getAdminDb().collection('analytics').add({ type: 'section_view', key: `area:${area}`, ts: FieldValue.serverTimestamp() });
    }
  } catch (error) {
    console.error('Analytics write error:', error);
  }

  return NextResponse.json({ ok: true });
}
