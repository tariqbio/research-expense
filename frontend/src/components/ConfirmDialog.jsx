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
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            {message}
          </p>

          {requiresTyping && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>
                Type <strong>{typingPrompt}</strong> to confirm:
              </label>
              <input
                type="text"
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                placeholder={`Type ${typingPrompt}`}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${typedValue === typingPrompt ? 'var(--success)' : 'var(--border)'}`,
                  borderRadius: 'var(--r-sm)',
                  fontFamily: 'var(--font)',
                  fontSize: '14px',
                }}
              />
            </div>
          )}

          {isDangerous && (
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--danger-bg)',
                border: `1px solid var(--danger-border)`,
                borderRadius: 'var(--r-sm)',
                color: 'var(--danger)',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              ⚠️ This action cannot be undone.
            </div>
          )}
        </div>

        <div className="modal-footer">
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
            style={{
              opacity: !canConfirm ? 0.5 : 1,
              cursor: !canConfirm ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }} />
                {confirmText}ing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
