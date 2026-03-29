import { useState, useEffect, useRef } from 'react';

/**
 * RowActions — a compact ⋯ dropdown for table row actions.
 * Replaces a line of inline buttons that forces horizontal scroll.
 *
 * Usage:
 *   <RowActions items={[
 *     { label: 'Edit', icon: '✏', className: 'accent', onClick: handleEdit },
 *     { label: 'Mark Paid', icon: '✓', className: 'success', onClick: handlePaid },
 *     { divider: true },
 *     { label: 'Delete', icon: '🗑', className: 'danger', onClick: handleDelete },
 *   ]} />
 */
export default function RowActions({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  // Filter out null/false items
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <div className="row-actions" ref={ref}>
      <button
        className="row-actions-trigger"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title="Actions"
      >
        ⋯
      </button>
      {open && (
        <div className="row-actions-menu" onClick={e => e.stopPropagation()}>
          {visible.map((item, i) => {
            if (item.divider) return <div key={i} className="row-actions-divider" />;
            return (
              <button
                key={i}
                className={`row-actions-item${item.className ? ' ' + item.className : ''}`}
                onClick={() => { setOpen(false); item.onClick(); }}
              >
                {item.icon && <span>{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
