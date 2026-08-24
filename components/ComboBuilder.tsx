'use client';

import { useState } from 'react';
import type { CatalogProduct } from '@/lib/catalog';
import { computeComboTotal, type ComboDefinition, type ComboSelections, type ComboSlot, type ComboSlotSelection } from '@/lib/combos';
import { hasOptionGroups, type OptionGroup, type ProductOption } from '@/lib/options';
import ProductConfigurator from './ProductConfigurator';

type Props = {
  products: CatalogProduct[];
  combo: ComboDefinition;
  optionGroups: OptionGroup[];
  productOptions: ProductOption[];
  hasSix: boolean;
  initialSelections?: ComboSelections;
  onAdd: (selections: ComboSelections) => void;
  onClose: () => void;
};

export default function ComboBuilder({ products, combo, optionGroups, productOptions, hasSix, initialSelections, onAdd, onClose }: Props) {
  const [step, setStep] = useState(initialSelections ? combo.slots.length : 0);
  const [selections, setSelections] = useState<ComboSelections>(initialSelections ?? {});
  const [configuringProductId, setConfiguringProductId] = useState<string | null>(null);

  const currentSlot: ComboSlot | undefined = combo.slots[step];
  const isSummary = !currentSlot;
  const slotSelections = (slotId: string) => selections[slotId] ?? [];
  const slotHasCapacity = (slot: ComboSlot) => slot.allowMultipleProducts || slotSelections(slot.id).length === 0;
  const canAdvance = !currentSlot || !currentSlot.required || slotSelections(currentSlot.id).some((item) => item.qty > 0);

  const upsertInSlot = (slotId: string, item: ComboSlotSelection) => {
    setSelections((current) => {
      const existing = current[slotId] ?? [];
      const idx = existing.findIndex((entry) => entry.productId === item.productId);
      const next = idx >= 0 ? existing.map((entry, i) => (i === idx ? item : entry)) : [...existing, item];
      return { ...current, [slotId]: next };
    });
  };

  const removeFromSlot = (slotId: string, productId: string) => {
    setSelections((current) => ({ ...current, [slotId]: (current[slotId] ?? []).filter((entry) => entry.productId !== productId) }));
  };

  const setSimpleQty = (slotId: string, product: CatalogProduct, qty: number) => {
    if (qty <= 0) { removeFromSlot(slotId, product.id); return; }
    upsertInSlot(slotId, { productId: product.id, name: product.name, price: product.price, qty });
  };

  const total = computeComboTotal(selections);

  const configuringProduct = configuringProductId ? products.find((product) => product.id === configuringProductId) : undefined;

  return (
    <div className="productModalBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="productModal" role="dialog" aria-modal="true" aria-labelledby="combo-builder-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="productModalClose" aria-label="Cerrar" onClick={onClose}>×</button>
        <div className="productModalBody">
          <div className="menuTop"><h2 id="combo-builder-title">{combo.name}</h2></div>
          <div className="comboSteps" aria-hidden="true">{combo.slots.map((slot, i) => <span key={slot.id} className={i <= step ? 'comboStep active' : 'comboStep'} />)}</div>

          {currentSlot && configuringProduct && (
            <ProductConfigurator
              product={configuringProduct}
              groups={optionGroups.filter((group) => group.productId === configuringProduct.id && group.active !== false).sort((a, b) => a.sortOrder - b.sortOrder)}
              options={productOptions.filter((option) => option.productId === configuringProduct.id && option.active !== false)}
              initial={(() => {
                const existing = slotSelections(currentSlot.id).find((entry) => entry.productId === configuringProduct.id);
                return existing?.configuration ? { configuration: existing.configuration, qty: existing.qty } : undefined;
              })()}
              onCancel={() => setConfiguringProductId(null)}
              onAdd={(configuration, unitPrice, qty) => {
                upsertInSlot(currentSlot.id, { productId: configuringProduct.id, name: configuringProduct.name, price: unitPrice, qty, configuration });
                setConfiguringProductId(null);
              }}
            />
          )}

          {currentSlot && !configuringProduct && <div className="comboSlot">
            <p className="variantGroupLabel">Paso {step + 1}: {currentSlot.title}{!currentSlot.required && ' (opcional)'}</p>
            <ul className="comboOptionList">
              {currentSlot.productIds.map((productId) => {
                const product = products.find((p) => p.id === productId);
                if (!product) return null;
                const existing = slotSelections(currentSlot.id).find((entry) => entry.productId === productId);
                if (!slotHasCapacity(currentSlot) && !existing) return null;

                if (hasOptionGroups(productId, optionGroups)) {
                  const detail = existing?.configuration?.flatMap((group) => group.selections.map((selection) => (selection.quantity > 1 ? `${selection.name} x${selection.quantity}` : selection.name))).join(', ');
                  return (
                    <li key={productId} className="comboOptionRow">
                      <span>{product.name}{detail ? ` — ${detail}` : ''}</span>
                      <div className="cartLineButtons">
                        {existing && <button type="button" className="cartLineLink cartLineRemove" onClick={() => removeFromSlot(currentSlot.id, productId)}>Quitar</button>}
                        <button type="button" className="btn secondary" onClick={() => setConfiguringProductId(productId)}>{existing ? 'Editar' : 'Agregar'}</button>
                      </div>
                    </li>
                  );
                }

                const isFree = product.price === 0;
                const freeLocked = isFree && !hasSix;
                const qty = existing?.qty ?? 0;
                const addDisabled = isFree && (freeLocked || qty >= 1);
                const priceLabel = isFree ? (freeLocked ? ' — gratis (con tu six)' : ' — gratis') : ` — $${product.price}`;
                return (
                  <li key={productId} className="comboOptionRow">
                    <span>{product.name}{priceLabel}</span>
                    <div className="qty">
                      <button type="button" aria-label={`Quitar ${product.name}`} onClick={() => setSimpleQty(currentSlot.id, product, qty - 1)}>−</button>
                      <span>{qty}</span>
                      <button type="button" aria-label={`Agregar ${product.name}`} disabled={addDisabled} onClick={() => setSimpleQty(currentSlot.id, product, qty + 1)}>+</button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="comboNav">
              {step > 0 && <button type="button" className="btn secondary" onClick={() => setStep((s) => s - 1)}>Atrás</button>}
              <button type="button" className="btn primary" disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>Siguiente</button>
            </div>
          </div>}

          {isSummary && <div className="comboSummary">
            <p className="variantGroupLabel">Resumen de tu desayuno</p>
            <ul className="comboSummaryList">
              {combo.slots.map((slot) => {
                const items = slotSelections(slot.id).filter((item) => item.qty > 0);
                return (
                  <li key={slot.id}>
                    <strong>{slot.title}:</strong> {items.length ? items.map((item) => {
                      const detail = item.configuration?.flatMap((group) => group.selections.map((selection) => (selection.quantity > 1 ? `${selection.name} x${selection.quantity}` : selection.name))).join(', ');
                      const label = item.qty > 1 ? `${item.name} x${item.qty}` : item.name;
                      return detail ? `${label} (${detail})` : label;
                    }).join(', ') : 'Sin selección'}
                  </li>
                );
              })}
            </ul>
            <div className="productModalPrice">Total: ${total}</div>
            <div className="comboNav">
              <button type="button" className="btn secondary" onClick={() => setStep(combo.slots.length - 1)}>Atrás</button>
              <button type="button" className="btn primary productModalAdd" onClick={() => onAdd(selections)}>{initialSelections ? 'Guardar cambios' : 'Agregar al pedido'}</button>
            </div>
          </div>}
        </div>
      </section>
    </div>
  );
}
