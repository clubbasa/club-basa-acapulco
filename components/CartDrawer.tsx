'use client';

import { useState } from 'react';
import type { CartLine } from '@/lib/cart';
import ConfirmDialog from './ConfirmDialog';

type Props = {
  lines: CartLine[];
  subtotal: number;
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIncrement: (lineId: string) => void;
  onDecrement: (lineId: string) => void;
  onRemove: (lineId: string) => void;
  onDuplicate: (lineId: string) => void;
  onEdit: (line: CartLine) => void;
  onClear: () => void;
  onCheckout: () => void;
  onViewMenu: () => void;
};

export default function CartDrawer({ lines, subtotal, count, open, onOpenChange, onIncrement, onDecrement, onRemove, onDuplicate, onEdit, onClear, onCheckout, onViewMenu }: Props) {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  return (
    <>
      {count > 0 && !open && (
        <button type="button" className="cart cartTrigger" onClick={() => onOpenChange(true)}>
          <div><strong>🛒 {count} {count === 1 ? 'artículo' : 'artículos'}</strong><br/><span>${subtotal}</span></div>
          <span className="cartTriggerCta">Ver pedido</span>
        </button>
      )}

      {open && <div className="productModalBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onOpenChange(false); }}>
        <section className="productModal cartDrawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" className="productModalClose" aria-label="Cerrar carrito" onClick={() => onOpenChange(false)}>×</button>
          <div className="productModalBody cartDrawerBody">
            <div className="menuTop"><h2 id="cart-drawer-title">Tu pedido</h2></div>

            {lines.length === 0 ? (
              <div className="cartEmpty">
                <div className="cartEmptyIcon" aria-hidden="true">🛒</div>
                <p><strong>Tu carrito está vacío</strong></p>
                <p className="small">Agrega algo delicioso de nuestro menú.</p>
                <button type="button" className="btn primary" onClick={() => { onOpenChange(false); onViewMenu(); }}>Ver menú</button>
              </div>
            ) : <>
              <ul className="cartLineList">
                {lines.map((line) => (
                  <li key={line.lineId} className="cartLine">
                    <div className="cartLineInfo">
                      <strong>{line.name}</strong>
                      {line.kind === 'combo' && <p className="small">{line.components.map((component) => component.name).join(' · ')}</p>}
                      <span className="cartLinePrice">${line.unitPrice * line.qty}</span>
                    </div>
                    <div className="cartLineActions">
                      <div className="qty">
                        <button type="button" aria-label={`Quitar uno de ${line.name}`} onClick={() => onDecrement(line.lineId)}>−</button>
                        <span>{line.qty}</span>
                        <button type="button" aria-label={`Agregar uno de ${line.name}`} onClick={() => onIncrement(line.lineId)}>+</button>
                      </div>
                      <div className="cartLineButtons">
                        {line.kind !== 'simple' && <button type="button" className="cartLineLink" onClick={() => onEdit(line)}>Editar</button>}
                        <button type="button" className="cartLineLink" onClick={() => onDuplicate(line.lineId)}>Duplicar</button>
                        <button type="button" className="cartLineLink cartLineRemove" onClick={() => onRemove(line.lineId)}>Eliminar</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="cartSummary">
                <div className="cartSummaryRow"><span>Subtotal</span><span>${subtotal}</span></div>
                <div className="cartSummaryRow"><span>Envío</span><span>Por confirmar</span></div>
                <div className="cartSummaryRow cartSummaryTotal"><span>Total</span><span>${subtotal}</span></div>
              </div>

              <button type="button" className="btn primary cartCheckout" onClick={onCheckout}>Enviar pedido por WhatsApp</button>
              <button type="button" className="cartClearLink" onClick={() => setConfirmClearOpen(true)}>Vaciar carrito</button>
            </>}
          </div>
        </section>
      </div>}

      {confirmClearOpen && <ConfirmDialog
        title="¿Vaciar todo el pedido?"
        confirmLabel="Vaciar carrito"
        cancelLabel="Cancelar"
        onConfirm={() => { onClear(); setConfirmClearOpen(false); }}
        onCancel={() => setConfirmClearOpen(false)}
      />}
    </>
  );
}
