import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { CartLine, ComboComponent, ConfigurationGroup } from './cart';

export type OrderCustomer = { name?: string; phone?: string; email?: string };

export type OrderItem = {
  kind: 'simple' | 'variant' | 'configured' | 'combo';
  productId?: string;
  comboId?: string;
  variantId?: string;
  sku?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  configuration?: ConfigurationGroup[];
  components?: ComboComponent[];
};

export type Order = {
  id: string;
  customerId: string | null;
  isGuest: boolean;
  customer?: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: string;
  whatsappMessage?: string;
  createdAt?: { toDate: () => Date };
};

// El servidor recalcula precio/SKU/configuración desde Firestore (nunca confía en lo
// que manda el cliente) — aquí solo se envían los identificadores de cada línea.
function cartLineToOrderInput(line: CartLine): Record<string, unknown> {
  if (line.kind === 'simple') return { kind: 'simple', productId: line.productId, quantity: line.qty };
  if (line.kind === 'variant') return { kind: 'variant', productId: line.productId, variantId: line.variantId, quantity: line.qty };
  if (line.kind === 'configured') return { kind: 'configured', productId: line.productId, configuration: line.configuration, quantity: line.qty };
  return {
    kind: 'combo',
    comboId: line.comboId,
    components: line.components.map((c) => ({ slotId: c.slotId, productId: c.productId, quantity: c.qty, configuration: c.configuration })),
    quantity: line.qty,
  };
}

export async function createOrderRequest(
  lines: CartLine[],
  customer: OrderCustomer,
  whatsappMessage: string,
  idToken?: string,
): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  try {
    const response = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
      body: JSON.stringify({ items: lines.filter((line) => line.qty > 0).map(cartLineToOrderInput), customer, whatsappMessage }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) return { ok: false, error: payload.error || 'No se pudo registrar el pedido.' };
    return { ok: true, orderId: payload.orderId };
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor.' };
  }
}

export async function getCustomerContact(uid: string): Promise<{ name?: string; whatsapp?: string }> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return {};
  const data = snap.data() as { name?: string; whatsapp?: string };
  return { name: data.name, whatsapp: data.whatsapp };
}

const ordersRef = collection(db, 'orders');

function sortByCreatedAtDesc(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => (b.createdAt?.toDate?.().getTime() ?? 0) - (a.createdAt?.toDate?.().getTime() ?? 0));
}

// Sin orderBy en la consulta a propósito: combinarlo con el where de customerId
// exigiría un índice compuesto que habría que crear manualmente en Firebase Console.
// El límite de 50 documentos hace que ordenar en el cliente sea barato.
export async function getMyOrders(uid: string): Promise<Order[]> {
  const snap = await getDocs(query(ordersRef, where('customerId', '==', uid), limit(50)));
  return sortByCreatedAtDesc(snap.docs.map((item) => ({ id: item.id, ...item.data() } as Order)));
}

export async function getAllOrders(): Promise<Order[]> {
  const snap = await getDocs(query(ordersRef, limit(50)));
  return sortByCreatedAtDesc(snap.docs.map((item) => ({ id: item.id, ...item.data() } as Order)));
}
