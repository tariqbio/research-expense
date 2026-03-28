import { useState, useEffect } from 'react';
import api from '../api';

export default function ProjectModal({ project, onClose, onSaved }) {
  const isEdit = !!project;
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    code:         project?.code || '',
    name:         project?.name || '',
    description:  project?.description || '',
    total_budget: project?.total_budget || '',
    payment_type: project?.payment_type || 'installment',
    status:       project?.status || 'active',
    start_date:   project?.start_date?.split('T')[0] || '',
    end_date:     project?.end_date?.split('T')[0] || '',
    member_ids:   [],
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
      if (isEdit) {
        await api.patch(`/projects/${project.id}`, {
          name:         form.name,
          description:  form.description,
          total_budget: form.total_budget ? Number(form.total_budget) : 0,
          payment_type: form.payment_type,
          status:       form.status,
          start_date:   form.start_date || null,
          end_date:     form.end_date || null,
        });
      } else {
        await api.post('/projects', {
          ...form,
          total_budget: form.total_budget ? Number(form.total_budget) : 0,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-head">
          <h3>{isEdit ? `Edit Project — ${project.code}` : 'New Research Project'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="notice notice-error">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Project Code *</label>
                <input className="form-input" placeholder="e.g. FGS-2024-01" value={form.code}
                  onChange={e => set('code', e.target.value.toUpperCase())}
                  disabled={isEdit} required />
                {!isEdit && <div className="form-hint">Unique short identifier — cannot be changed later</div>}
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
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="completed">Completed / Ended</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" value={form.start_date}
                  onChange={e => set('start_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-input" value={form.end_date}
                  onChange={e => set('end_date', e.target.value)} />
              </div>
            </div>

            {!isEdit && members.length > 0 && (
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
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
