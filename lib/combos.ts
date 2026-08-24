import type { ComboCartLine, ComboComponent, ConfigurationGroup } from './cart';

export type ComboSlot = {
  id: string;
  title: string;
  required: boolean;
  /** true: se pueden agregar varios productos distintos a la vez (ej. Malteada y Té).
   * false: el slot admite un único producto elegido (pero puede seguir siendo configurable). */
  allowMultipleProducts: boolean;
  productIds: string[];
};

export type ComboDefinition = { id: string; name: string; slots: ComboSlot[] };

export type ComboSlotSelection = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  configuration?: ConfigurationGroup[];
};

// slotId -> productos elegidos en ese paso (con su configuración, si el producto la tiene).
export type ComboSelections = Record<string, ComboSlotSelection[]>;

export const COMBOS: ComboDefinition[] = [
  {
    id: 'arma-tu-desayuno',
    name: 'Arma tu desayuno',
    slots: [
      { id: 'bebida', title: 'Elige tu bebida', required: true, allowMultipleProducts: true, productIds: ['shake', 'tea', 'aloe', 'coffee'] },
      { id: 'complemento', title: 'Elige tu complemento', required: false, allowMultipleProducts: false, productIds: ['single'] },
      { id: 'fibra', title: 'Agrega fibra', required: false, allowMultipleProducts: false, productIds: ['fiber'] },
      { id: 'waffle', title: 'Agrega un waffle', required: false, allowMultipleProducts: false, productIds: ['waffle'] },
      { id: 'extra', title: 'Extras opcionales', required: false, allowMultipleProducts: true, productIds: ['single', 'coffee'] },
    ],
  },
];

export function getCombo(comboId: string): ComboDefinition | undefined {
  return COMBOS.find((combo) => combo.id === comboId);
}

export function computeComboTotal(selections: ComboSelections): number {
  return Object.values(selections).flat().reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function buildComboLine(combo: ComboDefinition, selections: ComboSelections): Omit<ComboCartLine, 'lineId' | 'addedAt' | 'qty'> {
  const components: ComboComponent[] = combo.slots.flatMap((slot): ComboComponent[] =>
    (selections[slot.id] ?? [])
      .filter((item) => item.qty > 0)
      .map((item): ComboComponent => ({
        slotId: slot.id,
        label: slot.title,
        productId: item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
        configuration: item.configuration,
      })),
  );
  const unitPrice = components.reduce((sum, component) => sum + component.price * component.qty, 0);
  return { kind: 'combo', comboId: combo.id, name: combo.name, unitPrice, components };
}
