import type { CatalogProduct } from './catalog';

type CartLineBase = { lineId: string; qty: number; addedAt: number };
export type SimpleCartLine = CartLineBase & { kind: 'simple'; productId: string; name: string; unitPrice: number };
export type VariantCartLine = CartLineBase & { kind: 'variant'; productId: string; variantId: string; name: string; unitPrice: number };
export type ComboComponent = { slotId: string; label: string; productId: string; variantId?: string; name: string; price: number; qty: number };
export type ComboCartLine = CartLineBase & { kind: 'combo'; comboId: string; name: string; unitPrice: number; components: ComboComponent[] };
export type CartLine = SimpleCartLine | VariantCartLine | ComboCartLine;
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type NewCartLine = DistributiveOmit<CartLine, 'lineId' | 'addedAt' | 'qty'>;

const STORAGE_KEY = 'clubbasa-cart-v2';
const LEGACY_STORAGE_KEY = 'clubbasa-cart';

export function computeLineSignature(line: Pick<CartLine, 'kind'> & Partial<CartLine>): string {
  if (line.kind === 'simple') return `simple:${(line as SimpleCartLine).productId}`;
  if (line.kind === 'variant') { const l = line as VariantCartLine; return `variant:${l.productId}:${l.variantId}`; }
  const l = line as ComboCartLine;
  const componentsKey = [...l.components].map((c) => `${c.slotId}=${c.productId}${c.variantId ? `/${c.variantId}` : ''}:${c.qty}`).sort().join('|');
  return `combo:${l.comboId}:${componentsKey}`;
}

export function addLine(lines: CartLine[], newLine: NewCartLine, qty = 1): CartLine[] {
  const lineId = computeLineSignature(newLine);
  const existing = lines.find((line) => line.lineId === lineId);
  if (existing) return lines.map((line) => (line.lineId === lineId ? { ...line, qty: line.qty + qty } : line));
  const created = { ...newLine, lineId, qty, addedAt: Date.now() } as CartLine;
  return [...lines, created];
}

export function updateQty(lines: CartLine[], lineId: string, qty: number): CartLine[] {
  if (qty <= 0) return lines.filter((line) => line.lineId !== lineId);
  return lines.map((line) => (line.lineId === lineId ? { ...line, qty } : line));
}

export function duplicateLine(lines: CartLine[], lineId: string): CartLine[] {
  const target = lines.find((line) => line.lineId === lineId);
  if (!target) return lines;
  const clone = { ...target, lineId: `${target.lineId}#${Date.now()}`, addedAt: Date.now(), qty: 1 } as CartLine;
  return [...lines, clone];
}

export function replaceLine(lines: CartLine[], oldLineId: string, newLine: NewCartLine, qty: number): CartLine[] {
  return addLine(lines.filter((line) => line.lineId !== oldLineId), newLine, qty);
}

export function removeLine(lines: CartLine[], lineId: string): CartLine[] {
  return lines.filter((line) => line.lineId !== lineId);
}

export function clearCart(): CartLine[] {
  return [];
}

export function computeSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
}

export function computeItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}

function migrateLegacyCart(products: CatalogProduct[]): CartLine[] {
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return [];
    const parsedLegacy: Record<string, number> = JSON.parse(legacy);
    return Object.entries(parsedLegacy)
      .filter(([, qty]) => qty > 0)
      .flatMap(([productId, qty]) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return [];
        const line: SimpleCartLine = { kind: 'simple', lineId: `simple:${productId}`, productId, name: product.name, unitPrice: product.price, qty, addedAt: Date.now() };
        return [line];
      });
  } catch {
    return [];
  }
}

export function loadCart(products: CatalogProduct[]): CartLine[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch { /* corrupt data or storage unavailable */ }
  return migrateLegacyCart(products);
}

export function saveCart(lines: CartLine[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch { /* localStorage unavailable (private browsing, storage full) */ }
}
