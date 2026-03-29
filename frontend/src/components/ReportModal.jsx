import { useState } from 'react';

/**
 * ReportModal — lets user configure what gets included in the PDF/XLSX report.
 *
 * Props:
 *   expenses      – full array of expense objects for the project
 *   onClose()     – close without generating
 *   onGenerate(filteredExpenses, meta) – proceed with the filtered list + metadata
 *
 * meta = { mode, label }   (for the report header date-range caption)
 */
export default function ReportModal({ expenses, onClose, onGenerate }) {
  const [mode, setMode] = useState('all');           // 'all' | 'last_n' | 'spend_range' | 'entry_range'
  const [lastN, setLastN] = useState(50);
  const [spendFrom, setSpendFrom] = useState('');
  const [spendTo, setSpendTo]   = useState('');
  const [entryFrom, setEntryFrom] = useState('');
  const [entryTo,   setEntryTo]   = useState('');
  const [sortBy, setSortBy] = useState('spend_desc'); // spend_desc | spend_asc | entry_desc | entry_asc

  const sorted = [...expenses].sort((a, b) => {
    if (sortBy === 'spend_desc')  return new Date(b.expense_date)  - new Date(a.expense_date);
    if (sortBy === 'spend_asc')   return new Date(a.expense_date)  - new Date(b.expense_date);
    if (sortBy === 'entry_desc')  return new Date(b.created_at || b.expense_date) - new Date(a.created_at || a.expense_date);
    if (sortBy === 'entry_asc')   return new Date(a.created_at || a.expense_date) - new Date(b.created_at || b.expense_date);
    return 0;
  });

  const compute = () => {
    let result = sorted;
    let label = 'All Entries';

    if (mode === 'last_n') {
      const n = Math.max(1, parseInt(lastN) || 50);
      result = sorted.slice(0, n);
      label = `Last ${result.length} Entries (by ${sortBy.startsWith('spend') ? 'Spending Date' : 'Entry Date'})`;
    } else if (mode === 'spend_range') {
      result = sorted.filter(e => {
        const d = new Date(e.expense_date);
        const from = spendFrom ? new Date(spendFrom) : null;
        const to   = spendTo   ? new Date(spendTo)   : null;
        return (!from || d >= from) && (!to || d <= to);
      });
      label = `Spending Date: ${spendFrom || 'Start'} — ${spendTo || 'Present'}`;
    } else if (mode === 'entry_range') {
      result = sorted.filter(e => {
        const d = new Date(e.created_at || e.expense_date);
        const from = entryFrom ? new Date(entryFrom) : null;
        const to   = entryTo   ? new Date(entryTo)   : null;
        return (!from || d >= from) && (!to || d <= to);
      });
      label = `Entry Date: ${entryFrom || 'Start'} — ${entryTo || 'Present'}`;
    }

    return { result, label };
  };

  const { result: preview, label } = compute();

  const handleGenerate = (type) => {
    const { result, label } = compute();
    onGenerate(result, { label, sortBy, mode, type });
  };

  const inputStyle = {
    padding: '7px 10px', fontSize: 13, border: '1px solid var(--border-strong)',
    borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-primary)',
    fontFamily: 'inherit', width: '100%',
  };
  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: 4,
  };

  const radioOption = (value, title, desc) => (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
      border: `1.5px solid ${mode === value ? 'var(--accent)' : 'var(--border-strong)'}`,
      borderRadius: 8, cursor: 'pointer',
      background: mode === value ? 'var(--accent-light)' : 'var(--bg-surface)',
      transition: 'all 0.15s',
    }}>
      <input type="radio" name="report_mode" value={value}
        checked={mode === value} onChange={() => setMode(value)}
        style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</div>
      </div>
    </label>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 14,
        width: '100%', maxWidth: 520,
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border-strong)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>📄 Generate Report</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Choose what to include in the report</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-tertiary)', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Sort order */}
          <div>
            <label style={labelStyle}>Sort Expenses By</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={inputStyle}>
              <option value="spend_desc">Spending Date — Newest First</option>
              <option value="spend_asc">Spending Date — Oldest First</option>
              <option value="entry_desc">Entry Date — Newest First</option>
              <option value="entry_asc">Entry Date — Oldest First</option>
            </select>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
              💡 "Spending date" = when money was spent. "Entry date" = when it was logged in the system.
            </div>
          </div>

          {/* Mode selection */}
          <div>
            <label style={labelStyle}>Filter Expenses</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {radioOption('all', 'All Expenses', 'Include every expense record for this project')}
              {radioOption('last_n', 'Last N Entries', 'Include only the most recent N entries (based on sort order above)')}
              {radioOption('spend_range', 'By Spending Date Range', 'Include expenses where money was actually spent within a date range')}
              {radioOption('entry_range', 'By Entry Date Range', 'Include expenses that were logged/entered into the system within a date range')}
            </div>
          </div>

          {/* Conditional inputs */}
          {mode === 'last_n' && (
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <label style={labelStyle}>Number of Entries</label>
              <input
                type="number" min={1} max={9999}
                value={lastN} onChange={e => setLastN(e.target.value)}
                style={{ ...inputStyle, width: 120 }}
                placeholder="e.g. 50"
              />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                Will include the top {lastN || '?'} entries after sorting by the selected order above.
              </div>
            </div>
          )}

          {mode === 'spend_range' && (
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Spending Date Range <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(the date money was spent)</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>From</label>
                  <input type="date" value={spendFrom} onChange={e => setSpendFrom(e.target.value)} style={inputStyle} />
                </div>
                <span style={{ color: 'var(--text-tertiary)', marginTop: 18 }}>—</span>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>To</label>
                  <input type="date" value={spendTo} onChange={e => setSpendTo(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {mode === 'entry_range' && (
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Entry Date Range <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(the date it was logged in the system)</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>From</label>
                  <input type="date" value={entryFrom} onChange={e => setEntryFrom(e.target.value)} style={inputStyle} />
                </div>
                <span style={{ color: 'var(--text-tertiary)', marginTop: 18 }}>—</span>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>To</label>
                  <input type="date" value={entryTo} onChange={e => setEntryTo(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* Preview count */}
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: preview.length === 0 ? 'rgba(220,38,38,0.08)' : 'rgba(40,233,140,0.08)',
            border: `1px solid ${preview.length === 0 ? 'var(--danger)' : 'var(--accent)'}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>{preview.length === 0 ? '⚠️' : '✅'}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {preview.length} expense{preview.length !== 1 ? 's' : ''} will be included
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-outline btn-sm"
            disabled={preview.length === 0}
            onClick={() => handleGenerate('xlsx')}
            title="Download as Excel spreadsheet"
          >📥 Download XLSX</button>
          <button
            className="btn btn-primary btn-sm"
            disabled={preview.length === 0}
            onClick={() => handleGenerate('pdf')}
            title="Open print-ready report"
          >🖨 Print / Save PDF</button>
        </div>
      </div>
    </div>
  );
}
