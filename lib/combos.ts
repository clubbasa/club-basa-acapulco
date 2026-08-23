import type { CatalogProduct } from './catalog';
import type { ComboCartLine, ComboComponent } from './cart';
import { resolveVariantPrice, VARIANT_GROUPS } from './variants';

export type ComboSlotOption = { id: string; label: string; productId: string; variantId?: string };
export type ComboSlot = { id: string; title: string; required: boolean; options: ComboSlotOption[] };
export type ComboDefinition = { id: string; name: string; slots: ComboSlot[] };
// slotId -> optionId -> cantidad elegida (0 o ausente = no seleccionado). Cada opción de
// cada paso admite su propia cantidad, para poder combinar varias (p. ej. 2 Malteadas
// + 1 Café) en vez de una sola opción por paso.
export type ComboSelections = Record<string, Record<string, number>>;

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

export function slotQtyTotal(selections: ComboSelections, slotId: string): number {
  return Object.values(selections[slotId] ?? {}).reduce((sum, qty) => sum + (qty > 0 ? qty : 0), 0);
}

export function buildComboLine(
  products: CatalogProduct[],
  combo: ComboDefinition,
  selections: ComboSelections,
): Omit<ComboCartLine, 'lineId' | 'addedAt' | 'qty'> {
  const components: ComboComponent[] = combo.slots.flatMap((slot): ComboComponent[] => {
    const slotSelection = selections[slot.id] ?? {};
    return slot.options
      .filter((option) => (slotSelection[option.id] ?? 0) > 0)
      .map((option): ComboComponent => ({
        slotId: slot.id,
        label: slot.title,
        productId: option.productId,
        variantId: option.variantId,
        name: option.label,
        price: resolveComboOptionPrice(products, option),
        qty: slotSelection[option.id],
      }));
  });
  const unitPrice = components.reduce((sum, component) => sum + component.price * component.qty, 0);
  return { kind: 'combo', comboId: combo.id, name: combo.name, unitPrice, components };
}
