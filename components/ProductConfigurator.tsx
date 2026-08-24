'use client';

import { useState } from 'react';
import type { CatalogProduct } from '@/lib/catalog';
import type { OptionGroup, ProductOption } from '@/lib/options';
import type { ConfigurationGroup } from '@/lib/cart';

type Selections = Record<string, Record<string, number>>;

type Props = {
  product: CatalogProduct;
  groups: OptionGroup[];
  options: ProductOption[];
  initial?: { configuration: ConfigurationGroup[]; qty: number };
  onAdd: (configuration: ConfigurationGroup[], unitPrice: number, qty: number) => void;
  onCancel?: () => void;
};

function initialSelections(initial?: { configuration: ConfigurationGroup[] }): Selections {
  if (!initial) return {};
  const map: Selections = {};
  initial.configuration.forEach((group) => {
    map[group.groupId] = {};
    group.selections.forEach((selection) => { map[group.groupId][selection.optionId] = selection.quantity; });
  });
  return map;
}

export default function ProductConfigurator({ product, groups, options, initial, onAdd, onCancel }: Props) {
  const [step, setStep] = useState(initial ? groups.length : 0);
  const [selections, setSelections] = useState<Selections>(() => initialSelections(initial));
  const [pendingQty, setPendingQty] = useState(initial?.qty ?? 1);

  const currentGroup: OptionGroup | undefined = groups[step];
  const isSummary = !currentGroup;
  const optionsForGroup = (groupId: string) => options.filter((option) => option.groupId === groupId).sort((a, b) => a.sortOrder - b.sortOrder);
  const groupTotalQty = (groupId: string) => Object.values(selections[groupId] ?? {}).reduce((sum, qty) => sum + (qty > 0 ? qty : 0), 0);

  const canAdvance = !currentGroup || !currentGroup.required || groupTotalQty(currentGroup.id) >= Math.max(1, currentGroup.minSelections);

  const setOptionQty = (group: OptionGroup, optionId: string, qty: number) => {
    setSelections((current) => {
      const currentGroupSelections = current[group.id] ?? {};
      if (group.selectionMode === 'single') {
        // Selección exclusiva: elegir una opción reemplaza cualquier otra del mismo grupo.
        if (qty > 0) return { ...current, [group.id]: { [optionId]: 1 } };
        const isCurrentlySelected = (currentGroupSelections[optionId] ?? 0) > 0;
        return isCurrentlySelected ? { ...current, [group.id]: {} } : current;
      }
      const currentForOption = currentGroupSelections[optionId] ?? 0;
      const currentTotal = Object.values(currentGroupSelections).reduce((sum, q) => sum + (q > 0 ? q : 0), 0);
      const nextTotal = currentTotal - currentForOption + Math.max(0, qty);
      if (qty > currentForOption && nextTotal > group.maxSelections) return current;
      return { ...current, [group.id]: { ...currentGroupSelections, [optionId]: Math.max(0, qty) } };
    });
  };

  const unitPrice = groups.reduce((sum, group) => {
    const groupSelection = selections[group.id] ?? {};
    return sum + optionsForGroup(group.id).reduce((groupSum, option) => groupSum + option.priceDelta * (groupSelection[option.id] ?? 0), 0);
  }, product.price);

  const buildConfiguration = (): ConfigurationGroup[] => groups
    .map((group): ConfigurationGroup => {
      const groupSelection = selections[group.id] ?? {};
      const chosen = optionsForGroup(group.id).filter((option) => (groupSelection[option.id] ?? 0) > 0);
      return { groupId: group.id, groupLabel: group.label, selections: chosen.map((option) => ({ optionId: option.id, name: option.label, quantity: groupSelection[option.id] })) };
    })
    .filter((group) => group.selections.length > 0);

  return (
    <div className="productConfigurator">
      {groups.length > 1 && <div className="comboSteps" aria-hidden="true">{groups.map((group, i) => <span key={group.id} className={i <= step ? 'comboStep active' : 'comboStep'} />)}</div>}

      {currentGroup && <div className="comboSlot">
        <p className="variantGroupLabel">
          {groups.length > 1 ? `Paso ${step + 1}: ` : ''}{currentGroup.label}{!currentGroup.required && ' (opcional)'}
          {currentGroup.selectionMode === 'multiple' && currentGroup.maxSelections > 1 && ` — ${groupTotalQty(currentGroup.id)}/${currentGroup.maxSelections}`}
        </p>
        <ul className="comboOptionList">
          {optionsForGroup(currentGroup.id).map((option) => {
            const qty = selections[currentGroup.id]?.[option.id] ?? 0;
            const capped = currentGroup.selectionMode === 'multiple' && (groupTotalQty(currentGroup.id) >= currentGroup.maxSelections || (!currentGroup.allowDuplicates && qty >= 1));
            const addDisabled = !option.available || capped;
            return (
              <li key={option.id} className="comboOptionRow">
                <span>{option.label}{!option.available ? ' — Agotado' : option.priceDelta > 0 ? ` — +$${option.priceDelta}` : ''}</span>
                <div className="qty">
                  <button type="button" aria-label={`Quitar ${option.label}`} onClick={() => setOptionQty(currentGroup, option.id, qty - 1)}>−</button>
                  <span>{qty}</span>
                  <button type="button" aria-label={`Agregar ${option.label}`} disabled={addDisabled} onClick={() => setOptionQty(currentGroup, option.id, qty + 1)}>+</button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="comboNav">
          {step > 0 && <button type="button" className="btn secondary" onClick={() => setStep((s) => s - 1)}>Atrás</button>}
          {step === 0 && onCancel && <button type="button" className="btn secondary" onClick={onCancel}>Cancelar</button>}
          <button type="button" className="btn primary" disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>Siguiente</button>
        </div>
      </div>}

      {isSummary && <div className="comboSummary">
        <ul className="comboSummaryList">
          {groups.map((group) => {
            const groupSelection = selections[group.id] ?? {};
            const chosen = optionsForGroup(group.id).filter((option) => (groupSelection[option.id] ?? 0) > 0);
            return (
              <li key={group.id}>
                <strong>{group.label}:</strong> {chosen.length ? chosen.map((option) => (groupSelection[option.id] > 1 ? `${option.label} x${groupSelection[option.id]}` : option.label)).join(', ') : 'Sin selección'}
              </li>
            );
          })}
        </ul>
        <div className="productModalActions">
          <button type="button" aria-label="Reducir cantidad" onClick={() => setPendingQty((q) => Math.max(1, q - 1))}>−</button>
          <span>{pendingQty}</span>
          <button type="button" aria-label="Aumentar cantidad" onClick={() => setPendingQty((q) => q + 1)}>+</button>
        </div>
        <div className="comboNav">
          {groups.length > 0 && <button type="button" className="btn secondary" onClick={() => setStep(groups.length - 1)}>Atrás</button>}
          {onCancel && <button type="button" className="btn secondary" onClick={onCancel}>Cancelar</button>}
          <button type="button" className="btn primary productModalAdd" onClick={() => onAdd(buildConfiguration(), unitPrice, pendingQty)}>{initial ? 'Guardar cambios' : `Agregar — $${unitPrice * pendingQty}`}</button>
        </div>
      </div>}
    </div>
  );
}
