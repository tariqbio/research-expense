import { useState } from 'react';
import api from '../api';

export default function InstallmentModal({ projectId, installment, onClose, onSaved }) {
  const isEdit = !!installment;
  const [form, setForm] = useState({
    amount:        installment?.amount || '',
    expected_date: installment?.expected_date?.split('T')[0] || '',
    received_date: installment?.received_date?.split('T')[0] || '',
    status:        installment?.status || 'pending',
    note:          installment?.note || '',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      return setError('Enter a valid amount');
    if (form.status === 'received' && !form.received_date)
      return setError('Please enter the date funds were received');

    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/projects/${projectId}/installments/${installment.id}`, {
          ...form, amount: Number(form.amount),
          received_date: form.status === 'received' ? form.received_date : null,
        });
      } else {
        await api.post(`/projects/${projectId}/installments`, {
          amount: Number(form.amount),
          expected_date: form.expected_date || null,
          received_date: form.status === 'received' ? form.received_date : null,
          status: form.status,
          note: form.note || null,
        });
      }
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
          <h3>{isEdit ? 'Edit Fund Installment' : 'Add Fund Installment'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="notice notice-error">{error}</div>}
            <div className="form-hint" style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--accent-light)', borderRadius: 'var(--r)', borderLeft: '3px solid var(--accent)', fontSize: 12.5 }}>
              An installment represents a portion of the total budget being released. Mark it as <strong>Received</strong> once funds have arrived, and record the actual receipt date.
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (৳) *</label>
                <input type="number" className="form-input" placeholder="0.00" min="0.01" step="0.01"
                  value={form.amount} onChange={e => set('amount', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="pending">Pending (not yet received)</option>
                  <option value="received">Received</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Expected Date</label>
                <input type="date" className="form-input" value={form.expected_date}
                  onChange={e => set('expected_date', e.target.value)} />
                <div className="form-hint">When funds are expected to arrive</div>
              </div>
              <div className="form-group">
                <label className="form-label">Date Received {form.status === 'received' ? '*' : ''}</label>
                <input type="date" className="form-input" value={form.received_date}
                  onChange={e => set('received_date', e.target.value)}
                  disabled={form.status !== 'received'} />
                <div className="form-hint">Actual date funds were received</div>
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
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Installment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
