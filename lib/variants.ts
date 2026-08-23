import type { CatalogProduct } from './catalog';

export type VariantOption = { id: string; label: string; priceDelta?: number };
export type VariantGroup = { productId: string; groupLabel: string; options: VariantOption[] };

export const VARIANT_GROUPS: VariantGroup[] = [
  {
    productId: 'single',
    groupLabel: 'Selecciona sabor',
    options: [
      { id: 'natural', label: 'Natural' },
      { id: 'girasol', label: 'Semillas de girasol' },
      { id: 'philadelphia', label: 'Philadelphia' },
      { id: 'arandano', label: 'Arándano' },
      { id: 'nuez', label: 'Nuez' },
    ],
  },
];

export function getVariantGroup(productId: string): VariantGroup | undefined {
  return VARIANT_GROUPS.find((group) => group.productId === productId);
}

export function resolveVariantPrice(product: CatalogProduct, option: VariantOption): number {
  return product.price + (option.priceDelta || 0);
}
