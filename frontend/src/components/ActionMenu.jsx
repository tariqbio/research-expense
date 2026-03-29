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
        <div className="action-menu-dropdown">
          {items.map((item, i) => (
            item === 'divider'
              ? <div key={i} className="action-menu-divider" />
              : (
                <button
                  key={i}
                  disabled={item.disabled}
                  onClick={e => { e.stopPropagation(); setOpen(false); item.onClick?.(e); }}
                  className={`action-menu-item${item.danger ? ' danger' : item.success ? ' success' : ''}`}
                  style={{ opacity: item.disabled ? 0.4 : 1, cursor: item.disabled ? 'not-allowed' : 'pointer' }}
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
