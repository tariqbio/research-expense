import { useState, useRef, useEffect } from 'react';

export default function ActionMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (items.filter(i => i !== 'divider').length === 0) return null;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-ghost btn-xs"
        style={{ fontSize: 18, padding: '1px 8px', lineHeight: 1.3, letterSpacing: 2, fontWeight: 700 }}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title="Actions"
      >⋯</button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 999,
          background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
          borderRadius: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
          minWidth: 164, padding: '4px 0',
        }}>
          {items.map((item, i) => (
            item === 'divider'
              ? <div key={i} style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
              : (
                <button
                  key={i}
                  disabled={item.disabled}
                  onClick={e => { e.stopPropagation(); setOpen(false); item.onClick?.(e); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', textAlign: 'left',
                    padding: '8px 14px', fontSize: 13, fontWeight: 500,
                    background: 'transparent',
                    border: 'none',
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    color: item.danger
                      ? 'var(--danger)'
                      : item.success
                        ? 'var(--success)'
                        : 'var(--text-primary)',
                    opacity: item.disabled ? 0.4 : 1,
                    transition: 'background 0.1s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {item.label}
                </button>
              )
          ))}
        </div>
      )}
    </div>
  );
}
