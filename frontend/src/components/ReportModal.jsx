import { useState } from 'react';

export default function ReportModal({ expenses, onClose, onGenerate }) {
  const [mode, setMode] = useState('all');
  const [lastN, setLastN] = useState(50);
  const [spendFrom, setSpendFrom] = useState('');
  const [spendTo,   setSpendTo]   = useState('');
  const [entryFrom, setEntryFrom] = useState('');
  const [entryTo,   setEntryTo]   = useState('');
  const [sortBy, setSortBy] = useState('spend_desc');

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
      label = `Last ${result.length} Entries (sorted by ${sortBy.startsWith('spend') ? 'Spending Date' : 'Entry Date'})`;
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

  const inp = {
    padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--border-strong)',
    borderRadius: 8, background: 'var(--bg-surface)',
    color: 'var(--text-primary)', fontFamily: 'var(--font)', width: '100%',
  };
  const lbl = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: 4,
  };

  const RadioOption = ({ value, title, desc }) => (
    <label className={`report-radio-option${mode === value ? ' selected' : ''}`}>
      <input type="radio" name="rmode" value={value}
        checked={mode === value} onChange={() => setMode(value)}
        style={{ marginTop: 3, accentColor: 'var(--accent)', flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</div>
      </div>
    </label>
  );

  return (
    <div className="report-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="report-modal">

        {/* Header */}
        <div className="report-modal-head">
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>📄 Generate Report</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Choose what to include</div>
          </div>
          <button className="report-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="report-modal-body">

          {/* Sort */}
          <div>
            <label style={lbl}>Sort Expenses By</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={inp}>
              <option value="spend_desc">Spending Date — Newest First</option>
              <option value="spend_asc">Spending Date — Oldest First</option>
              <option value="entry_desc">Entry Date — Newest First</option>
              <option value="entry_asc">Entry Date — Oldest First</option>
            </select>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 5 }}>
              💡 Spending date = when money was spent. Entry date = when it was logged in the system.
            </div>
          </div>

          {/* Mode */}
          <div>
            <label style={lbl}>Filter Expenses</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <RadioOption value="all"         title="All Expenses"             desc="Include every expense record for this project" />
              <RadioOption value="last_n"      title="Last N Entries"           desc="Most recent N entries based on sort order above" />
              <RadioOption value="spend_range" title="By Spending Date Range"   desc="Filter by when money was actually spent" />
              <RadioOption value="entry_range" title="By Entry Date Range"      desc="Filter by when the expense was logged in the system" />
            </div>
          </div>

          {/* Conditional inputs */}
          {mode === 'last_n' && (
            <div className="report-sub-panel">
              <label style={lbl}>Number of Entries</label>
              <input type="number" min={1} max={9999}
                value={lastN} onChange={e => setLastN(e.target.value)}
                style={{ ...inp, width: 120 }} placeholder="e.g. 50" />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                Will include the top {lastN || '?'} entries after sorting.
              </div>
            </div>
          )}

          {mode === 'spend_range' && (
            <div className="report-sub-panel">
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Spending Date Range <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(the date money was spent)</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>From</label>
                  <input type="date" value={spendFrom} onChange={e => setSpendFrom(e.target.value)} style={inp} />
                </div>
                <span style={{ color: 'var(--text-tertiary)', marginTop: 18 }}>—</span>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>To</label>
                  <input type="date" value={spendTo} onChange={e => setSpendTo(e.target.value)} style={inp} />
                </div>
              </div>
            </div>
          )}

          {mode === 'entry_range' && (
            <div className="report-sub-panel">
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Entry Date Range <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(the date it was logged)</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>From</label>
                  <input type="date" value={entryFrom} onChange={e => setEntryFrom(e.target.value)} style={inp} />
                </div>
                <span style={{ color: 'var(--text-tertiary)', marginTop: 18 }}>—</span>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>To</label>
                  <input type="date" value={entryTo} onChange={e => setEntryTo(e.target.value)} style={inp} />
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className={`report-preview-badge ${preview.length === 0 ? 'zero' : 'ok'}`}>
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
        <div className="report-modal-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-outline btn-sm" disabled={preview.length === 0} onClick={() => handleGenerate('xlsx')}>
            📥 Download XLSX
          </button>
          <button className="btn btn-primary btn-sm" disabled={preview.length === 0} onClick={() => handleGenerate('pdf')}>
            🖨 Save as PDF <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 400 }}>(print)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
