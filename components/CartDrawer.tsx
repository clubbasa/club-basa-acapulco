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
  const [isCartExpanded, setIsCartExpanded] = useState(true);

  const cartInfo = `${count} ${count === 1 ? 'artículo' : 'artículos'}, $${subtotal}`;

  return (
    <>
      {count > 0 && !open && (
        <div
          className={`cart cartTrigger ${isCartExpanded ? 'cartExpanded' : 'cartMinimized'}`}
          role="button"
          tabIndex={0}
          aria-expanded={isCartExpanded}
          aria-label={isCartExpanded ? `${cartInfo}. Toca para minimizar.` : `${cartInfo}. Toca para ver el pedido completo.`}
          onClick={() => setIsCartExpanded((expanded) => !expanded)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setIsCartExpanded((expanded) => !expanded); } }}
        >
          {isCartExpanded ? <>
            <div><strong>🛒 {count} {count === 1 ? 'artículo' : 'artículos'}</strong><br/><span>${subtotal}</span></div>
            <button
              type="button"
              className="cartTriggerCta"
              onClick={(event) => { event.stopPropagation(); onOpenChange(true); }}
              onKeyDown={(event) => event.stopPropagation()}
            >Ver pedido</button>
          </> : <span className="cartPillText">🛒 {count} · ${subtotal}</span>}
        </div>
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
                      {line.kind === 'combo' && <p className="small">{line.components.map((component) => {
                        const qtyLabel = component.qty > 1 ? `${component.name} x${component.qty}` : component.name;
                        const detail = component.configuration?.flatMap((group) => group.selections.map((selection) => (selection.quantity > 1 ? `${selection.name} x${selection.quantity}` : selection.name))).join(', ');
                        return detail ? `${qtyLabel} (${detail})` : qtyLabel;
                      }).join(' · ')}</p>}
                      {line.kind === 'configured' && <p className="small">{line.configuration.flatMap((group) => group.selections.map((selection) => selection.quantity > 1 ? `${selection.name} x${selection.quantity}` : selection.name)).join(' · ')}</p>}
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
              <p className="small cartLegalNote">Al enviar tu pedido aceptas nuestros <a href="/terminos-y-condiciones">Términos y Condiciones</a> y nuestra <a href="/politica-cambios-cancelaciones">Política de Cambios y Cancelaciones</a>.</p>
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
