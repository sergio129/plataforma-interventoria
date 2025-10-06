import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 380, textAlign: 'center', padding: '28px 24px' }}>
        <div style={{ marginBottom: 18, fontSize: 18, color: '#334155', fontWeight: 500 }}>{message}</div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="btn primary" onClick={onConfirm}>Eliminar</button>
          <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
