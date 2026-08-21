import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

// Only page/section visits and product/CTA interactions are persisted here —
// no IP address, user agent, or auth/session data is ever stored. Values are
// matched against fixed allow-lists so clients can't create arbitrary
// counter buckets or write free-form data.
const ALLOWED_PAGES = new Set(['/', '/blog', '/blog/panquecitos-acapulco', '/blog/menu-club-basa', '/blog/envios-acapulco']);
const ALLOWED_AREAS = new Set(['hero', 'producto-estrella', 'oferta', 'categorias', 'menu', 'experiencia', 'pedido']);
// Landing CTAs — lets the admin see which button converts best (view_product/
// add_to_cart already exist below and are used by the catalog too).
const ALLOWED_CTAS = new Set([
  'header_order', 'hero_order', 'hero_menu', 'six_order', 'offer_order',
  'menu_explore', 'final_order', 'final_menu', 'sticky_order',
  'envios_cotizar', 'experiencia_contacto',
]);
// Product ids are a fixed catalog (lib/menu.ts + the "menu" poster), not
// free-form input from the client.
const ALLOWED_PRODUCT_IDS = new Set(['six', 'single', 'waffle', 'crepa', 'shake', 'special', 'tea', 'aloe', 'fiber', 'fruit', 'rolls', 'coffee', 'menu']);

async function write(type: string, key: string) {
  await getAdminDb().collection('analytics').add({ type, key, ts: FieldValue.serverTimestamp() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.event) return NextResponse.json({ ok: false }, { status: 400 });

  const { path, area, cta, product } = body.data || {};

  try {
    if (body.event === 'page_view' && typeof path === 'string' && ALLOWED_PAGES.has(path)) {
      await write('page_view', `page:${path}`);
    } else if (body.event === 'section_view' && typeof area === 'string' && ALLOWED_AREAS.has(area)) {
      await write('section_view', `area:${area}`);
    } else if (body.event === 'cta_click' && typeof cta === 'string' && ALLOWED_CTAS.has(cta)) {
      await write('cta_click', `cta:${cta}`);
    } else if (body.event === 'view_product' && typeof product === 'string' && ALLOWED_PRODUCT_IDS.has(product)) {
      await write('view_product', `product:${product}`);
    } else if (body.event === 'add_to_cart' && typeof product === 'string' && ALLOWED_PRODUCT_IDS.has(product)) {
      await write('add_to_cart', `product:${product}`);
    } else if (body.event === 'whatsapp_order') {
      // Fired when the cart's own WhatsApp checkout button is clicked — the
      // real "begin_order" moment, distinct from a generic click_whatsapp
      // (e.g. the hero CTA) which doesn't necessarily carry cart items yet.
      await write('begin_order', 'cta:cart_checkout');
    }
  } catch (error) {
    console.error('Analytics write error:', error);
  }

  return NextResponse.json({ ok: true });
}
