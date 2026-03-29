import { useState, useRef, useEffect } from 'react';

/**
 * A "⋯" kebab-menu that shows action items in a dropdown.
 * Usage:
 *   <ActionMenu items={[
 *     { label: '✏ Edit', onClick: () => ..., },
 *     { label: '🗑 Delete', onClick: () => ..., danger: true },
 *   ]} />
 */
export default function ActionMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-ghost btn-xs"
        style={{ fontSize: 16, padding: '2px 8px', lineHeight: 1, letterSpacing: 1 }}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title="Actions"
      >⋯</button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 200,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          minWidth: 150, overflow: 'hidden',
        }}>
          {items.map((item, i) => (
            item === 'divider'
              ? <div key={i} style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
              : (
                <button
                  key={i}
                  disabled={item.disabled}
                  onClick={e => { e.stopPropagation(); setOpen(false); item.onClick && item.onClick(e); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 14px', fontSize: 13, fontWeight: 500,
                    background: 'none', border: 'none', cursor: item.disabled ? 'not-allowed' : 'pointer',
                    color: item.danger ? 'var(--danger)' : item.success ? 'var(--success)' : 'var(--text-primary)',
                    opacity: item.disabled ? 0.45 : 1,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!item.disabled) e.target.style.background = 'var(--bg-subtle)'; }}
                  onMouseLeave={e => { e.target.style.background = 'none'; }}
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
