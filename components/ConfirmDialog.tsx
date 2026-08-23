'use client';

type Props = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ title, description, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  return (
    <div className="confirmDialogBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="confirmDialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <h3 id="confirm-dialog-title">{title}</h3>
        {description && <p className="small">{description}</p>}
        <div className="confirmDialogActions">
          <button type="button" className="btn secondary" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="btn primary confirmDialogDanger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
