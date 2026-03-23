import { useState, useEffect } from 'react';
import api from '../api';

const CATEGORIES = [
  { value: 'transportation',      label: 'Transportation' },
  { value: 'printing_stationery', label: 'Printing & Stationery' },
  { value: 'field_work',          label: 'Field Work / Data Collection' },
  { value: 'communication',       label: 'Communication' },
  { value: 'miscellaneous',       label: 'Miscellaneous' },
];

export default function ExpenseModal({ projectId, onClose, onSaved }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({
    project_id:   projectId || '',
    category:     '',
    description:  '',
    amount:       '',
    expense_date: new Date().toISOString().split('T')[0],
    receipt_note: '',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId) {
      api.get('/projects').then(r => setProjects(r.data)).catch(() => {});
    }
  }, [projectId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.project_id) return setError('Please select a project');
    if (!form.category)   return setError('Please select a category');
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      return setError('Enter a valid positive amount');

    setSaving(true);
    try {
      await api.post('/expenses', { ...form, amount: Number(form.amount) });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Add Expense</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            {!projectId && (
              <div className="form-group">
                <label className="form-label">Project *</label>
                <select className="form-select" value={form.project_id} onChange={e => set('project_id', e.target.value)} required>
                  <option value="">Select project…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)} required>
                  <option value="">Select…</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" className="form-input" value={form.expense_date}
                  onChange={e => set('expense_date', e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <input className="form-input" placeholder="e.g. Bus fare to survey site, Dhaka–Gazipur"
                value={form.description} onChange={e => set('description', e.target.value)} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (৳) *</label>
                <input type="number" className="form-input" placeholder="0.00" min="0.01" step="0.01"
                  value={form.amount} onChange={e => set('amount', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Receipt / Note</label>
                <input className="form-input" placeholder="Receipt no., memo…"
                  value={form.receipt_note} onChange={e => set('receipt_note', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Submit Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
