'use client';

import { useState } from 'react';
import type { CatalogProduct } from '@/lib/catalog';
import { resolveVariantPrice, type VariantGroup, type VariantOption } from '@/lib/variants';

type Props = {
  product: CatalogProduct;
  group: VariantGroup;
  onAdd: (option: VariantOption, qty: number) => void;
};

export default function VariantPicker({ product, group, onAdd }: Props) {
  const [selectedId, setSelectedId] = useState(group.options[0]?.id ?? '');
  const [pendingQty, setPendingQty] = useState(1);
  const selectedOption = group.options.find((option) => option.id === selectedId) ?? group.options[0];
  const unitPrice = selectedOption ? resolveVariantPrice(product, selectedOption) : product.price;

  return (
    <div className="variantPicker">
      <p className="variantGroupLabel">{group.groupLabel}</p>
      <div className="variantOptions" role="radiogroup" aria-label={group.groupLabel}>
        {group.options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === selectedId}
            className={option.id === selectedId ? 'variantOption active' : 'variantOption'}
            onClick={() => setSelectedId(option.id)}
          >{option.label}</button>
        ))}
      </div>
      <div className="productModalActions">
        <button type="button" aria-label="Reducir cantidad" onClick={() => setPendingQty((qty) => Math.max(1, qty - 1))}>−</button>
        <span>{pendingQty}</span>
        <button type="button" aria-label="Aumentar cantidad" onClick={() => setPendingQty((qty) => qty + 1)}>+</button>
      </div>
      <button type="button" className="btn primary productModalAdd" onClick={() => selectedOption && onAdd(selectedOption, pendingQty)}>Agregar — ${unitPrice * pendingQty}</button>
    </div>
  );
}
