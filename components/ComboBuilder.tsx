'use client';

import { useState } from 'react';
import type { CatalogProduct } from '@/lib/catalog';
import { resolveComboOptionPrice, type ComboDefinition, type ComboSlot, type ComboSlotOption } from '@/lib/combos';

type Props = {
  products: CatalogProduct[];
  combo: ComboDefinition;
  initialSelections?: Record<string, ComboSlotOption | null>;
  onAdd: (selections: Record<string, ComboSlotOption | null>) => void;
  onClose: () => void;
};

export default function ComboBuilder({ products, combo, initialSelections, onAdd, onClose }: Props) {
  const [step, setStep] = useState(initialSelections ? combo.slots.length : 0);
  const [selections, setSelections] = useState<Record<string, ComboSlotOption | null>>(initialSelections ?? {});

  const currentSlot: ComboSlot | undefined = combo.slots[step];
  const isSummary = !currentSlot;
  const canAdvance = !currentSlot || !currentSlot.required || !!selections[currentSlot.id];

  const select = (slot: ComboSlot, option: ComboSlotOption) => {
    setSelections((current) => ({ ...current, [slot.id]: option }));
  };

  const priceOf = (option: ComboSlotOption) => resolveComboOptionPrice(products, option);
  const total = combo.slots.reduce((sum, slot) => {
    const option = selections[slot.id];
    return sum + (option ? priceOf(option) : 0);
  }, 0);

  return (
    <div className="productModalBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="productModal" role="dialog" aria-modal="true" aria-labelledby="combo-builder-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="productModalClose" aria-label="Cerrar" onClick={onClose}>×</button>
        <div className="productModalBody">
          <div className="menuTop"><h2 id="combo-builder-title">{combo.name}</h2></div>
          <div className="comboSteps" aria-hidden="true">{combo.slots.map((slot, i) => <span key={slot.id} className={i <= step ? 'comboStep active' : 'comboStep'} />)}</div>

          {currentSlot && <div className="comboSlot">
            <p className="variantGroupLabel">Paso {step + 1}: {currentSlot.title}</p>
            <div className="variantOptions" role="radiogroup" aria-label={currentSlot.title}>
              {currentSlot.options.map((option) => {
                const price = priceOf(option);
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selections[currentSlot.id]?.id === option.id}
                    className={selections[currentSlot.id]?.id === option.id ? 'variantOption active' : 'variantOption'}
                    onClick={() => select(currentSlot, option)}
                  >{option.label}{price > 0 ? ` — $${price}` : ' — gratis'}</button>
                );
              })}
            </div>
            <div className="comboNav">
              {step > 0 && <button type="button" className="btn secondary" onClick={() => setStep((s) => s - 1)}>Atrás</button>}
              {!currentSlot.required && <button type="button" className="btn secondary" onClick={() => { setSelections((current) => ({ ...current, [currentSlot.id]: null })); setStep((s) => s + 1); }}>Omitir</button>}
              <button type="button" className="btn primary" disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>Siguiente</button>
            </div>
          </div>}

          {isSummary && <div className="comboSummary">
            <p className="variantGroupLabel">Resumen de tu desayuno</p>
            <ul className="comboSummaryList">
              {combo.slots.map((slot) => {
                const option = selections[slot.id];
                return <li key={slot.id}><strong>{slot.title}:</strong> {option ? option.label : 'Sin selección'}</li>;
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
