import { useState, useEffect } from 'react';
import api from '../api';

export default function ProjectModal({ onClose, onSaved }) {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    code: '', name: '', description: '',
    total_budget: '', payment_type: 'installment',
    start_date: '', end_date: '',
    member_ids: [],
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/users').then(r => setMembers(r.data.filter(u => u.role === 'member'))).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleMember = (id) => {
    setForm(f => ({
      ...f,
      member_ids: f.member_ids.includes(id)
        ? f.member_ids.filter(x => x !== id)
        : [...f.member_ids, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.code || !form.name) return setError('Code and name are required');
    setSaving(true);
    try {
      await api.post('/projects', {
        ...form,
        total_budget: form.total_budget ? Number(form.total_budget) : 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-head">
          <h3>New Research Project</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="notice notice-error">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Project Code *</label>
                <input className="form-input" placeholder="e.g. FGS-2024-01" value={form.code}
                  onChange={e => set('code', e.target.value.toUpperCase())} required />
                <div className="form-hint">Unique short identifier</div>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Type *</label>
                <select className="form-select" value={form.payment_type} onChange={e => set('payment_type', e.target.value)}>
                  <option value="installment">Installments</option>
                  <option value="upfront">Upfront (full amount at start)</option>
                  <option value="end">End of project</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Project Title *</label>
              <input className="form-input" placeholder="Full project title" value={form.name}
                onChange={e => set('name', e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="Brief description, funding body, objectives…"
                value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Total Budget (৳)</label>
                <input type="number" className="form-input" placeholder="0.00" min="0" step="0.01"
                  value={form.total_budget} onChange={e => set('total_budget', e.target.value)} />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={form.start_date}
                    onChange={e => set('start_date', e.target.value)} />
                </div>
              </div>
            </div>

            {members.length > 0 && (
              <div className="form-group">
                <label className="form-label">Add Team Members</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {members.map(m => (
                    <label key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                      padding: '5px 10px', border: '1px solid',
                      borderColor: form.member_ids.includes(m.id) ? 'var(--accent)' : 'var(--border-strong)',
                      borderRadius: 'var(--r)', fontSize: 13,
                      background: form.member_ids.includes(m.id) ? 'var(--accent-light)' : 'var(--bg-surface)',
                    }}>
                      <input type="checkbox" checked={form.member_ids.includes(m.id)}
                        onChange={() => toggleMember(m.id)} style={{ cursor: 'pointer' }} />
                      {m.name}
                    </label>
                  ))}
                </div>
                <div className="form-hint">You (admin) are added automatically.</div>
              </div>
            )}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
