import { useState, useEffect } from 'react';
import api from '../api';

const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const COLORS = ['#4f46e5','#0891b2','#16a34a','#d97706','#dc2626','#7c3aed','#0f766e'];

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]    = useState({ name: '', email: '', password: '', role: 'member' });
  const [error, setError]  = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { const { data } = await api.get('/auth/users'); setMembers(data); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async e => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!form.name || !form.email || !form.password) return setError('All fields are required.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setSaving(true);
    try {
      await api.post('/auth/users', form);
      setSuccess(`Account created for ${form.name}. They can now sign in.`);
      setForm({ name: '', email: '', password: '', role: 'member' });
      setShowModal(false); load();
    } catch(e) { setError(e.response?.data?.error || 'Failed to create account.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove ${name}'s account? This cannot be undone.`)) return;
    try { await api.delete(`/auth/users/${id}`); load(); }
    catch(e) { alert(e.response?.data?.error || 'Could not remove.'); }
  };

  const admins  = members.filter(m => m.role === 'admin');
  const regular = members.filter(m => m.role !== 'admin');

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-eyebrow">Access Control</div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">
            {members.length} account{members.length !== 1 ? 's' : ''} · {admins.length} admin{admins.length !== 1 ? 's' : ''} · {regular.length} researcher{regular.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); setSuccess(''); }}>
          + Add Member
        </button>
      </div>

      <div className="page-body">
        {success && <div className="notice notice-success">✓ {success}</div>}

        {/* Admins */}
        {admins.length > 0 && (
          <>
            <div className="section-header" style={{ marginBottom: 14 }}>
              <div>
                <div className="section-title">Administrators</div>
                <div className="section-subtitle">Full system access</div>
              </div>
            </div>
            <div className="members-grid" style={{ marginBottom: 28 }}>
              {admins.map((m, i) => (
                <div key={m.id} className="member-card" style={{ animationDelay: (i * 0.06) + 's', borderTop: '3px solid var(--accent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div className="member-avatar" style={{ background: COLORS[i % COLORS.length] }}>
                      {m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="member-name">{m.name}</div>
                      <div className="member-email">{m.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="badge badge-indigo">⭐ Admin</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Since {fmtDate(m.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Members */}
        <div className="section-header" style={{ marginBottom: 14 }}>
          <div>
            <div className="section-title">Researchers</div>
            <div className="section-subtitle">Can submit expenses for assigned projects</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => { setShowModal(true); setError(''); }}>+ Add Member</button>
        </div>

        {loading ? (
          <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : regular.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h4>No members yet</h4>
            <p>Add researchers so they can submit expenses for their assigned projects.</p>
          </div>
        ) : (
          <div className="members-grid" style={{ marginBottom: 28 }}>
            {regular.map((m, i) => (
              <div key={m.id} className="member-card" style={{ animationDelay: (i * 0.06) + 's', borderTop: '3px solid var(--border-strong)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div className="member-avatar" style={{ background: COLORS[(i + admins.length) % COLORS.length] }}>
                    {m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="member-name">{m.name}</div>
                    <div className="member-email">{m.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="badge badge-gray">Researcher</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{fmtDate(m.created_at)}</span>
                    <button className="btn btn-ghost btn-xs" onClick={() => handleDelete(m.id, m.name)}
                      style={{ color: 'var(--danger)' }}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Policy */}
        <div className="card">
          <div className="card-header"><span className="card-title">Access Policy</span></div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-card indigo">
                <div className="info-card-title">⭐ Administrator</div>
                <div className="info-card-body">Create and manage projects, add team members, view all expenses across all projects, and approve reimbursements.</div>
              </div>
              <div className="info-card green">
                <div className="info-card-title">👤 Researcher</div>
                <div className="info-card-body">Submit expenses for assigned projects only. Can view and delete their own pending expenses. Cannot change payment status.</div>
              </div>
              <div className="info-card amber">
                <div className="info-card-title">🔒 Audit Lock</div>
                <div className="info-card-body">Once an expense is marked as reimbursed, it is permanently locked. All reimbursement actions are timestamped and logged.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-head">
              <h3>Create Member Account</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="notice notice-error">⚠ {error}</div>}
                <div className="form-group">
                  <label className="form-label">Full Name <span className="form-required">*</span></label>
                  <input className="form-input" placeholder="e.g. Dr. Abdul Karim" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address <span className="form-required">*</span></label>
                  <input type="email" className="form-input" placeholder="name@diu.edu.bd" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  <div className="form-hint">This will be their login email address.</div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Temporary Password <span className="form-required">*</span></label>
                    <input type="password" className="form-input" placeholder="Min. 8 characters" value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                    <div className="form-hint">Share this securely with the member.</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="member">Researcher / Member</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
