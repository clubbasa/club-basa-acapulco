import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { enforceRateLimit, errorResponse, readJsonBody, successResponse } from '@/lib/api-abuse';

export const runtime = 'nodejs';

// Only page/section visits and product/CTA interactions are persisted here —
// no IP address, user agent, or auth/session data is ever stored. Values are
// matched against fixed allow-lists so clients can't create arbitrary
// counter buckets or write free-form data.
const ALLOWED_PAGES = new Set(['/', '/blog', '/blog/panquecitos-acapulco', '/blog/menu-club-basa', '/blog/envios-acapulco', '/aviso-de-privacidad', '/terminos-y-condiciones', '/politica-cambios-cancelaciones']);
const ALLOWED_AREAS = new Set(['hero', 'producto-estrella', 'desayuno', 'categorias', 'menu', 'experiencia', 'pedido']);
// Landing CTAs — lets the admin see which button converts best (view_product/
// add_to_cart already exist below and are used by the catalog too).
const ALLOWED_CTAS = new Set([
  'header_order', 'hero_order', 'hero_menu', 'six_order', 'breakfast_order',
  'menu_explore', 'final_order', 'final_menu', 'sticky_order',
  'envios_cotizar', 'experiencia_contacto', 'como_llegar',
]);
// Product ids are a fixed catalog (lib/menu.ts + the "menu" poster), not
// free-form input from the client.
const ALLOWED_PRODUCT_IDS = new Set(['six', 'single', 'waffle', 'crepa', 'shake', 'special', 'tea', 'aloe', 'fiber', 'fruit', 'rolls', 'coffee', 'menu']);

async function write(type: string, key: string) {
  await getAdminDb().collection('analytics').add({ type, key, ts: FieldValue.serverTimestamp() });
}

export async function POST(req: Request) {
  const rateLimitError = enforceRateLimit(req, 'analytics', { limit: 120, windowMs: 60_000 });
  if (rateLimitError) return rateLimitError;

  const parsed = await readJsonBody(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return errorResponse('Solicitud inválida.', 400);

  const event = (body as { event?: unknown }).event;
  const data = (body as { data?: unknown }).data;
  if (typeof event !== 'string' || !data || typeof data !== 'object' || Array.isArray(data)) {
    return errorResponse('Solicitud inválida.', 400);
  }

  const { path, area, cta, product } = data as Record<string, unknown>;

  try {
    if (event === 'page_view' && typeof path === 'string' && ALLOWED_PAGES.has(path)) {
      await write('page_view', `page:${path}`);
    } else if (event === 'section_view' && typeof area === 'string' && ALLOWED_AREAS.has(area)) {
      await write('section_view', `area:${area}`);
    } else if (event === 'cta_click' && typeof cta === 'string' && ALLOWED_CTAS.has(cta)) {
      await write('cta_click', `cta:${cta}`);
    } else if (event === 'view_product' && typeof product === 'string' && ALLOWED_PRODUCT_IDS.has(product)) {
      await write('view_product', `product:${product}`);
    } else if (event === 'add_to_cart' && typeof product === 'string' && ALLOWED_PRODUCT_IDS.has(product)) {
      await write('add_to_cart', `product:${product}`);
    } else if (event === 'whatsapp_order') {
      // Fired when the cart's own WhatsApp checkout button is clicked — the
      // real "begin_order" moment, distinct from a generic click_whatsapp
      // (e.g. the hero CTA) which doesn't necessarily carry cart items yet.
      await write('begin_order', 'cta:cart_checkout');
    } else return errorResponse('Evento de analítica no permitido.', 400);
  } catch (error) {
    console.error('Analytics write error:', error);
    return errorResponse('No se pudo registrar el evento.', 500);
  }

  return successResponse();
}
