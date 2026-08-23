'use client';

import { useEffect, useState } from 'react';
import type { CatalogProduct } from '@/lib/catalog';
import {
  addLine,
  clearCart,
  computeItemCount,
  computeSubtotal,
  duplicateLine,
  loadCart,
  removeLine,
  replaceLine,
  saveCart,
  updateQty,
  type CartLine,
  type ComboComponent,
} from '@/lib/cart';

export function useCart(products: CatalogProduct[]) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(loadCart(products));
    setHydrated(true);
    // Hydration only needs to run once, off whatever product data is available synchronously
    // (the fallback catalog) — it must not re-run when the Firestore catalog swaps `products` in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCart(lines);
  }, [lines, hydrated]);

  const addSimple = (product: CatalogProduct, qty = 1) => {
    setLines((current) => addLine(current, { kind: 'simple', productId: product.id, name: product.name, unitPrice: product.price }, qty));
  };

  const addVariant = (productId: string, variantId: string, name: string, unitPrice: number, qty = 1) => {
    setLines((current) => addLine(current, { kind: 'variant', productId, variantId, name, unitPrice }, qty));
  };

  const addCombo = (comboId: string, name: string, unitPrice: number, components: ComboComponent[], qty = 1) => {
    setLines((current) => addLine(current, { kind: 'combo', comboId, name, unitPrice, components }, qty));
  };

  const setQty = (lineId: string, qty: number) => setLines((current) => updateQty(current, lineId, qty));
  const remove = (lineId: string) => setLines((current) => removeLine(current, lineId));
  const clear = () => setLines(clearCart());
  const duplicate = (lineId: string) => setLines((current) => duplicateLine(current, lineId));

  const replaceVariant = (oldLineId: string, productId: string, variantId: string, name: string, unitPrice: number, qty: number) => {
    setLines((current) => replaceLine(current, oldLineId, { kind: 'variant', productId, variantId, name, unitPrice }, qty));
  };

  const replaceCombo = (oldLineId: string, comboId: string, name: string, unitPrice: number, components: ComboComponent[], qty: number) => {
    setLines((current) => replaceLine(current, oldLineId, { kind: 'combo', comboId, name, unitPrice, components }, qty));
  };

  return {
    lines,
    subtotal: computeSubtotal(lines),
    count: computeItemCount(lines),
    addSimple,
    addVariant,
    addCombo,
    setQty,
    remove,
    clear,
    duplicate,
    replaceVariant,
    replaceCombo,
  };
}
