import type { CatalogProduct } from './catalog';
import type { ComboCartLine, ComboComponent } from './cart';
import { resolveVariantPrice, VARIANT_GROUPS } from './variants';

export type ComboSlotOption = { id: string; label: string; productId: string; variantId?: string };
export type ComboSlot = { id: string; title: string; required: boolean; options: ComboSlotOption[] };
export type ComboDefinition = { id: string; name: string; slots: ComboSlot[] };

const panquecitoFlavorOptions: ComboSlotOption[] = (VARIANT_GROUPS.find((group) => group.productId === 'single')?.options ?? [])
  .map((option) => ({ id: option.id, label: `Panquecito ${option.label}`, productId: 'single', variantId: option.id }));

export const COMBOS: ComboDefinition[] = [
  {
    id: 'arma-tu-desayuno',
    name: 'Arma tu desayuno',
    slots: [
      {
        id: 'bebida',
        title: 'Elige tu bebida',
        required: true,
        options: [
          { id: 'malteada', label: 'Malteada', productId: 'shake' },
          { id: 'te', label: 'Té', productId: 'tea' },
          { id: 'aloe', label: 'Aloe', productId: 'aloe' },
          { id: 'cafe', label: 'Café', productId: 'coffee' },
        ],
      },
      {
        id: 'complemento',
        title: 'Elige tu complemento',
        required: true,
        options: panquecitoFlavorOptions,
      },
      {
        id: 'extra',
        title: 'Extras opcionales',
        required: false,
        options: [
          { id: 'panquecito-extra', label: 'Panquecito adicional', productId: 'single' },
          { id: 'cafe-cortesia', label: 'Café de cortesía', productId: 'coffee' },
        ],
      },
    ],
  },
];

export function getCombo(comboId: string): ComboDefinition | undefined {
  return COMBOS.find((combo) => combo.id === comboId);
}

export function resolveComboOptionPrice(products: CatalogProduct[], option: ComboSlotOption): number {
  const product = products.find((p) => p.id === option.productId);
  if (!product) return 0;
  if (!option.variantId) return product.price;
  const variantOption = VARIANT_GROUPS.find((group) => group.productId === option.productId)?.options.find((o) => o.id === option.variantId);
  return variantOption ? resolveVariantPrice(product, variantOption) : product.price;
}

export function buildComboLine(
  products: CatalogProduct[],
  combo: ComboDefinition,
  selections: Record<string, ComboSlotOption | null>,
): Omit<ComboCartLine, 'lineId' | 'addedAt' | 'qty'> {
  const components: ComboComponent[] = combo.slots
    .map((slot): ComboComponent | null => {
      const option = selections[slot.id];
      if (!option) return null;
      return { slotId: slot.id, label: slot.title, productId: option.productId, variantId: option.variantId, name: option.label, price: resolveComboOptionPrice(products, option) };
    })
    .filter((component): component is ComboComponent => component !== null);
  const unitPrice = components.reduce((sum, component) => sum + component.price, 0);
  return { kind: 'combo', comboId: combo.id, name: combo.name, unitPrice, components };
}
