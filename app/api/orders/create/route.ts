import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getCombo } from '@/lib/combos';
import { VARIANT_GROUPS } from '@/lib/variants';
import { enforceRateLimit, errorResponse, readJsonBody, successResponse } from '@/lib/api-abuse';

export const runtime = 'nodejs';

type CatalogDoc = { id: string; name?: string; price?: number; sku?: string; active?: boolean };
type GroupDoc = { id: string; productId?: string; label?: string; required?: boolean; minSelections?: number; maxSelections?: number; active?: boolean };
type OptionDoc = { id: string; groupId?: string; productId?: string; label?: string; priceDelta?: number; active?: boolean; available?: boolean };
type Catalog = { products: Map<string, CatalogDoc>; groups: Map<string, GroupDoc>; options: Map<string, OptionDoc> };

class OrderError extends Error {}

async function loadCatalog(): Promise<Catalog> {
  const adminDb = getAdminDb();
  const [productsSnap, groupsSnap, optionsSnap] = await Promise.all([
    adminDb.collection('products').get(),
    adminDb.collection('optionGroups').get(),
    adminDb.collection('productOptions').get(),
  ]);
  return {
    products: new Map(productsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as CatalogDoc])),
    groups: new Map(groupsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as GroupDoc])),
    options: new Map(optionsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as OptionDoc])),
  };
}

function resolveGroupSelections(productId: string, groupInput: unknown, catalog: Catalog) {
  if (!groupInput || typeof groupInput !== 'object') throw new OrderError('Selección inválida.');
  const groupId = String((groupInput as Record<string, unknown>).groupId || '');
  const group = catalog.groups.get(groupId);
  if (!group || group.productId !== productId || group.active === false) throw new OrderError('Selección inválida.');

  const rawSelections = (groupInput as Record<string, unknown>).selections;
  const selections = Array.isArray(rawSelections) ? rawSelections : [];
  let total = 0;
  let priceDelta = 0;
  const resolvedSelections = selections.map((rawSelection) => {
    if (!rawSelection || typeof rawSelection !== 'object') throw new OrderError('Selección inválida.');
    const optionId = String((rawSelection as Record<string, unknown>).optionId || '');
    const quantity = Number((rawSelection as Record<string, unknown>).quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new OrderError('Cantidad inválida.');
    const option = catalog.options.get(optionId);
    if (!option || option.groupId !== groupId || option.productId !== productId || option.active === false || option.available === false) {
      throw new OrderError('Una opción elegida ya no está disponible.');
    }
    total += quantity;
    priceDelta += (Number(option.priceDelta) || 0) * quantity;
    return { optionId, name: String(option.label || optionId), quantity };
  });

  if (group.maxSelections && total > group.maxSelections) throw new OrderError('Se excede el máximo permitido en una selección.');
  if (group.required && total < Math.max(1, group.minSelections || 0)) throw new OrderError('Falta una selección requerida.');

  return { groupId, groupLabel: String(group.label || ''), selections: resolvedSelections, priceDelta };
}

function resolveConfiguration(productId: string, configurationInput: unknown, catalog: Catalog) {
  const product = catalog.products.get(productId);
  if (!product || product.active === false) throw new OrderError('Producto no disponible.');
  const groups = Array.isArray(configurationInput) ? configurationInput : [];
  const resolvedGroups = groups.map((groupInput) => resolveGroupSelections(productId, groupInput, catalog));
  const unitPrice = Number(product.price || 0) + resolvedGroups.reduce((sum, g) => sum + g.priceDelta, 0);
  return {
    name: String(product.name || productId),
    sku: product.sku,
    unitPrice,
    configuration: resolvedGroups.map(({ groupId, groupLabel, selections }) => ({ groupId, groupLabel, selections })),
  };
}

function resolveSimple(productId: string, catalog: Catalog) {
  const product = catalog.products.get(productId);
  if (!product || product.active === false) throw new OrderError('Producto no disponible.');
  return { name: String(product.name || productId), sku: product.sku, unitPrice: Number(product.price || 0) };
}

function resolveVariant(productId: string, variantId: string, catalog: Catalog) {
  const product = catalog.products.get(productId);
  if (!product || product.active === false) throw new OrderError('Producto no disponible.');
  const group = VARIANT_GROUPS.find((g) => g.productId === productId);
  const option = group?.options.find((o) => o.id === variantId);
  if (!option) throw new OrderError('Variante no disponible.');
  return { name: `${product.name} (${option.label})`, sku: product.sku, unitPrice: Number(product.price || 0) + (option.priceDelta || 0) };
}

function resolveCombo(comboId: string, componentsInput: unknown, catalog: Catalog) {
  const combo = getCombo(comboId);
  if (!combo) throw new OrderError('Combo no disponible.');
  const components = Array.isArray(componentsInput) ? componentsInput : [];

  const resolvedComponents = components.map((rawComponent) => {
    if (!rawComponent || typeof rawComponent !== 'object') throw new OrderError('Parte del combo inválida.');
    const input = rawComponent as Record<string, unknown>;
    const slotId = String(input.slotId || '');
    const slot = combo.slots.find((s) => s.id === slotId);
    if (!slot) throw new OrderError('Parte del combo inválida.');
    const productId = String(input.productId || '');
    if (!slot.productIds.includes(productId)) throw new OrderError('Producto no permitido en este paso del combo.');
    const quantity = Number(input.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new OrderError('Cantidad inválida.');

    if (input.configuration) {
      const resolved = resolveConfiguration(productId, input.configuration, catalog);
      return { slotId, label: slot.title, productId, name: resolved.name, price: resolved.unitPrice, qty: quantity, configuration: resolved.configuration };
    }
    const resolved = resolveSimple(productId, catalog);
    return { slotId, label: slot.title, productId, name: resolved.name, price: resolved.unitPrice, qty: quantity };
  });

  combo.slots.forEach((slot) => {
    if (slot.required && !resolvedComponents.some((c) => c.slotId === slot.id && c.qty > 0)) {
      throw new OrderError(`Falta seleccionar: ${slot.title}.`);
    }
  });

  const unitPrice = resolvedComponents.reduce((sum, c) => sum + c.price * c.qty, 0);
  return { name: combo.name, unitPrice, components: resolvedComponents };
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

function resolveOrderItem(input: unknown, catalog: Catalog) {
  if (!input || typeof input !== 'object') throw new OrderError('Artículo de pedido inválido.');
  const item = input as Record<string, unknown>;
  const kind = String(item.kind || '');
  const quantity = Number(item.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 50) throw new OrderError('Cantidad de artículo inválida.');

  if (kind === 'simple') {
    const productId = String(item.productId || '');
    const resolved = resolveSimple(productId, catalog);
    return stripUndefined({ kind, productId, sku: resolved.sku, name: resolved.name, unitPrice: resolved.unitPrice, quantity, lineTotal: resolved.unitPrice * quantity });
  }
  if (kind === 'variant') {
    const productId = String(item.productId || '');
    const variantId = String(item.variantId || '');
    const resolved = resolveVariant(productId, variantId, catalog);
    return stripUndefined({ kind, productId, variantId, sku: resolved.sku, name: resolved.name, unitPrice: resolved.unitPrice, quantity, lineTotal: resolved.unitPrice * quantity });
  }
  if (kind === 'configured') {
    const productId = String(item.productId || '');
    const resolved = resolveConfiguration(productId, item.configuration, catalog);
    return stripUndefined({ kind, productId, sku: resolved.sku, name: resolved.name, unitPrice: resolved.unitPrice, configuration: resolved.configuration, quantity, lineTotal: resolved.unitPrice * quantity });
  }
  if (kind === 'combo') {
    const comboId = String(item.comboId || '');
    const resolved = resolveCombo(comboId, item.components, catalog);
    return stripUndefined({ kind, comboId, name: resolved.name, unitPrice: resolved.unitPrice, components: resolved.components, quantity, lineTotal: resolved.unitPrice * quantity });
  }
  throw new OrderError('Tipo de artículo inválido.');
}

export async function POST(req: Request) {
  const rateLimitError = enforceRateLimit(req, 'orders', { limit: 15, windowMs: 15 * 60_000 });
  if (rateLimitError) return rateLimitError;

  const parsed = await readJsonBody(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return errorResponse('Solicitud inválida.', 400);

  const { items: rawItems, customer: rawCustomer, whatsappMessage: rawWhatsappMessage } = body as Record<string, unknown>;
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 30) return errorResponse('El pedido no tiene artículos válidos.', 400);

  let customerId: string | null = null;
  let isGuest = true;
  const authorization = req.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (token) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      customerId = decoded.uid;
      isGuest = false;
    } catch {
      // Token inválido o expirado: se trata como invitado en vez de bloquear el pedido.
    }
  }

  const catalog = await loadCatalog();

  let items;
  try {
    items = rawItems.map((item) => resolveOrderItem(item, catalog));
  } catch (error) {
    if (error instanceof OrderError) return errorResponse(error.message, 400);
    console.error('Order item resolution error:', error);
    return errorResponse('No se pudo procesar el pedido.', 400);
  }

  const subtotal = items.reduce((sum, item) => sum + (item.lineTotal as number), 0);

  const customerInput = rawCustomer && typeof rawCustomer === 'object' ? rawCustomer as Record<string, unknown> : {};
  const name = typeof customerInput.name === 'string' ? customerInput.name.trim().slice(0, 200) : '';
  const phone = typeof customerInput.phone === 'string' ? customerInput.phone.trim().slice(0, 40) : '';
  const email = typeof customerInput.email === 'string' ? customerInput.email.trim().slice(0, 200) : '';
  const whatsappMessage = typeof rawWhatsappMessage === 'string' ? rawWhatsappMessage.slice(0, 4_000) : '';

  try {
    const ref = await getAdminDb().collection('orders').add({
      customerId,
      isGuest,
      customer: stripUndefined({ name: name || undefined, phone: phone || undefined, email: email || undefined }),
      items,
      subtotal,
      total: subtotal,
      status: 'pending',
      whatsappMessage,
      createdAt: FieldValue.serverTimestamp(),
    });
    return successResponse({ orderId: ref.id });
  } catch (error) {
    console.error('Order create error:', error);
    return errorResponse('No se pudo guardar el pedido.', 500);
  }
}
