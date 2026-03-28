import { useState, useEffect } from 'react';
import api from '../api';

const BASE_CATEGORIES = [
  { value: 'transportation',      label: 'Transportation' },
  { value: 'printing_stationery', label: 'Printing & Stationery' },
  { value: 'field_work',          label: 'Field Work / Data Collection' },
  { value: 'communication',       label: 'Communication' },
  { value: 'other',               label: 'Other (specify below)' },
];

export default function ExpenseModal({ projectId, expense, onClose, onSaved }) {
  const isEdit = !!expense;
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({
    project_id:   projectId || expense?.project_id || '',
    category:     expense?.category || '',
    description:  expense?.description || '',
    amount:       expense?.amount || '',
    expense_date: expense?.expense_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    receipt_note: expense?.receipt_note || '',
    other_label:  expense?.category === 'other' ? (expense?.other_label || '') : '',
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
    if (form.category === 'other' && !form.other_label.trim())
      return setError('Please specify the expense type');
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      return setError('Enter a valid positive amount');

    setSaving(true);
    try {
      const payload = {
        project_id:   form.project_id,
        category:     form.category,
        description:  form.description,
        amount:       Number(form.amount),
        expense_date: form.expense_date,
        receipt_note: form.receipt_note,
        other_label:  form.category === 'other' ? form.other_label.trim() : undefined,
      };
      if (isEdit) {
        await api.patch(`/expenses/${expense.id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
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
        <div className="modal-head">
          <h3>{isEdit ? 'Edit Expense' : 'Add Expense'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="notice notice-error">{error}</div>}

            {!projectId && !isEdit && (
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
                  {BASE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" className="form-input" value={form.expense_date}
                  onChange={e => set('expense_date', e.target.value)} required />
              </div>
            </div>

            {form.category === 'other' && (
              <div className="form-group">
                <label className="form-label">Specify Expense Type *</label>
                <input className="form-input" placeholder="e.g. Equipment rental, Software license…"
                  value={form.other_label} onChange={e => set('other_label', e.target.value)} required />
              </div>
            )}

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
          <div className="modal-foot">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Submit Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
