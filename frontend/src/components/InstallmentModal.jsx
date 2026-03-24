import { useState } from 'react';
import api from '../api';

export default function InstallmentModal({ projectId, onClose, onSaved }) {
  const [form, setForm] = useState({ amount: '', expected_date: '', note: '' });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      return setError('Enter a valid amount');

    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/installments`, {
        ...form, amount: Number(form.amount)
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Add Fund Installment</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="notice notice-error">{error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (৳) *</label>
                <input type="number" className="form-input" placeholder="0.00" min="0.01" step="0.01"
                  value={form.amount} onChange={e => set('amount', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Expected Date</label>
                <input type="date" className="form-input" value={form.expected_date}
                  onChange={e => set('expected_date', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Note</label>
              <input className="form-input" placeholder="e.g. 1st tranche from HEQEP grant…"
                value={form.note} onChange={e => set('note', e.target.value)} />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Add Installment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
