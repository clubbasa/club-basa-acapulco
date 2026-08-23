'use client';

import { useState } from 'react';
import type { CatalogProduct } from '@/lib/catalog';
import { resolveComboOptionPrice, slotQtyTotal, type ComboDefinition, type ComboSelections, type ComboSlot, type ComboSlotOption } from '@/lib/combos';

type Props = {
  products: CatalogProduct[];
  combo: ComboDefinition;
  initialSelections?: ComboSelections;
  onAdd: (selections: ComboSelections) => void;
  onClose: () => void;
};

export default function ComboBuilder({ products, combo, initialSelections, onAdd, onClose }: Props) {
  const [step, setStep] = useState(initialSelections ? combo.slots.length : 0);
  const [selections, setSelections] = useState<ComboSelections>(initialSelections ?? {});

  const currentSlot: ComboSlot | undefined = combo.slots[step];
  const isSummary = !currentSlot;
  const canAdvance = !currentSlot || !currentSlot.required || slotQtyTotal(selections, currentSlot.id) > 0;

  const setOptionQty = (slotId: string, optionId: string, qty: number) => {
    setSelections((current) => ({ ...current, [slotId]: { ...current[slotId], [optionId]: Math.max(0, qty) } }));
  };

  const priceOf = (option: ComboSlotOption) => resolveComboOptionPrice(products, option);
  const total = combo.slots.reduce((sum, slot) => {
    const slotSelection = selections[slot.id] ?? {};
    return sum + slot.options.reduce((slotSum, option) => slotSum + priceOf(option) * (slotSelection[option.id] ?? 0), 0);
  }, 0);

  return (
    <div className="productModalBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="productModal" role="dialog" aria-modal="true" aria-labelledby="combo-builder-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="productModalClose" aria-label="Cerrar" onClick={onClose}>×</button>
        <div className="productModalBody">
          <div className="menuTop"><h2 id="combo-builder-title">{combo.name}</h2></div>
          <div className="comboSteps" aria-hidden="true">{combo.slots.map((slot, i) => <span key={slot.id} className={i <= step ? 'comboStep active' : 'comboStep'} />)}</div>

          {currentSlot && <div className="comboSlot">
            <p className="variantGroupLabel">Paso {step + 1}: {currentSlot.title}{!currentSlot.required && ' (opcional)'}</p>
            <ul className="comboOptionList">
              {currentSlot.options.map((option) => {
                const price = priceOf(option);
                const qty = selections[currentSlot.id]?.[option.id] ?? 0;
                return (
                  <li key={option.id} className="comboOptionRow">
                    <span>{option.label}{price > 0 ? ` — $${price}` : ' — gratis'}</span>
                    <div className="qty">
                      <button type="button" aria-label={`Quitar ${option.label}`} onClick={() => setOptionQty(currentSlot.id, option.id, qty - 1)}>−</button>
                      <span>{qty}</span>
                      <button type="button" aria-label={`Agregar ${option.label}`} onClick={() => setOptionQty(currentSlot.id, option.id, qty + 1)}>+</button>
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
                const slotSelection = selections[slot.id] ?? {};
                const chosen = slot.options.filter((option) => (slotSelection[option.id] ?? 0) > 0);
                return (
                  <li key={slot.id}>
                    <strong>{slot.title}:</strong> {chosen.length ? chosen.map((option) => (slotSelection[option.id] > 1 ? `${option.label} x${slotSelection[option.id]}` : option.label)).join(', ') : 'Sin selección'}
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
