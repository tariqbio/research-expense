import React, { useState } from 'react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  requiresTyping = false,
  typingPrompt = '',
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  const [typedValue, setTypedValue] = useState('');

  if (!isOpen) return null;

  const canConfirm = requiresTyping ? typedValue === typingPrompt : true;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
            {message}
          </p>

          {isDangerous && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--r)',
                color: 'var(--danger)',
                fontSize: '13px',
                marginBottom: requiresTyping ? '16px' : '0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              ⚠️ This action cannot be undone.
            </div>
          )}

          {requiresTyping && (
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                Type <strong style={{ color: 'var(--danger)' }}>{typingPrompt}</strong> to confirm:
              </label>
              <input
                type="text"
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                placeholder={`Type ${typingPrompt}`}
                className="form-input"
                style={{
                  borderColor: typedValue === typingPrompt ? 'var(--success)' : undefined,
                }}
              />
            </div>
          )}
        </div>

        {/* Footer — gap:10px handles spacing */}
        <div className="modal-foot">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`btn ${isDangerous ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={!canConfirm || isLoading}
            style={{ opacity: !canConfirm ? 0.5 : 1, cursor: !canConfirm ? 'not-allowed' : 'pointer' }}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                {confirmText}ing…
              </>
            ) : confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
