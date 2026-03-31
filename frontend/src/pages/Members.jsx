import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const COLORS = ['#4f46e5','#0891b2','#16a34a','#d97706','#dc2626','#7c3aed','#0f766e'];

export default function Members() {
  const { user, workspaceName } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers]   = useState([]);
  const [pending, setPending]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('members'); // members | pending | add
  const [form, setForm]         = useState({ name: '', email: '', password: '', role: 'member', position: '' });
  const [editUser, setEditUser] = useState(null);
  const [resetId, setResetId]   = useState(null);
  const [resetPw, setResetPw]   = useState('');
  const [msg, setMsg]           = useState({ type: '', text: '' });
  const [saving, setSaving]     = useState(false);

  const load = async () => {
    try {
      const [mRes, pRes] = await Promise.all([
        api.get('/auth/users'),
        api.get('/auth/pending'),
      ]);
      setMembers(mRes.data);
      setPending(pRes.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type:'', text:'' }), 4000); };

  const handleCreate = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return showMsg('error', 'Name, email and password are required.');
    if (form.password.length < 8) return showMsg('error', 'Password must be at least 8 characters.');
    setSaving(true);
    try {
      await api.post('/auth/users', form);
      showMsg('success', `Account created for ${form.name}.`);
      setForm({ name: '', email: '', password: '', role: 'member', position: '' });
      setTab('members'); load();
    } catch(e) { showMsg('error', e.response?.data?.error || 'Failed to create account.'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id, name) => {
    try {
      await api.patch(`/auth/users/${id}/approve`);
      showMsg('success', `${name} approved.`);
      load();
    } catch(e) { showMsg('error', e.response?.data?.error || 'Failed to approve.'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove ${name}'s account? This cannot be undone.`)) return;
    try { await api.delete(`/auth/users/${id}`); load(); showMsg('success', `${name} removed.`); }
    catch(e) { showMsg('error', e.response?.data?.error || 'Could not remove.'); }
  };

  const handleEdit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await api.patch(`/auth/users/${editUser.id}`, {
        name: editUser.name, role: editUser.role, position: editUser.position
      });
      showMsg('success', 'Member updated.'); setEditUser(null); load();
    } catch(e) { showMsg('error', e.response?.data?.error || 'Update failed.'); }
    finally { setSaving(false); }
  };

  const handleResetPw = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await api.patch(`/auth/users/${resetId}/reset-password`, { password: resetPw });
      showMsg('success', 'Password reset successfully.'); setResetId(null); setResetPw('');
    } catch(e) { showMsg('error', e.response?.data?.error || 'Reset failed.'); }
    finally { setSaving(false); }
  };

  const admins  = members.filter(m => m.role === 'admin');
  const regular = members.filter(m => m.role !== 'admin');

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-eyebrow">Administration</div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">
            {members.length} account{members.length !== 1 ? 's' : ''} in {workspaceName}
            {pending.length > 0 && <span style={{ color: 'var(--warning)', marginLeft: 8 }}>· {pending.length} pending approval</span>}
          </p>
        </div>
      </div>

      <div className="page-body">
        {msg.text && (
          <div className={`notice notice-${msg.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 16 }}>
            {msg.type === 'success' ? '✓' : '⚠'} {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {[
            { key: 'members', label: `Members (${members.length})` },
            { key: 'pending', label: `Pending Approval${pending.length ? ` (${pending.length})` : ''}`, warn: pending.length > 0 },
            { key: 'add', label: '+ Add Member Directly' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: 'none', borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t.key ? 'var(--accent)' : t.warn ? 'var(--warning)' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Members tab */}
        {tab === 'members' && (
          <>
            {loading ? (
              <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
            ) : (
              <>
                {admins.length > 0 && (
                  <>
                    <div className="section-header" style={{ marginBottom: 14 }}>
                      <div><div className="section-title">Administrators</div><div className="section-subtitle">Full access to this workspace</div></div>
                    </div>
                    <div className="members-grid" style={{ marginBottom: 28 }}>
                      {admins.map((m, i) => (
                        <MemberCard key={m.id} m={m} i={i} isMe={m.id === user?.id}
                          onEdit={() => setEditUser({ ...m })}
                          onResetPw={() => setResetId(m.id)}
                          onDelete={() => handleDelete(m.id, m.name)}
                          colors={COLORS} />
                      ))}
                    </div>
                  </>
                )}
                <div className="section-header" style={{ marginBottom: 14 }}>
                  <div><div className="section-title">Researchers</div><div className="section-subtitle">Access to assigned projects only</div></div>
                </div>
                {regular.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <h4>No researchers yet</h4>
                    <p>Add members or wait for them to self-register and approve them.</p>
                  </div>
                ) : (
                  <div className="members-grid">
                    {regular.map((m, i) => (
                      <MemberCard key={m.id} m={m} i={i + admins.length} isMe={m.id === user?.id}
                        onEdit={() => setEditUser({ ...m })}
                        onResetPw={() => setResetId(m.id)}
                        onDelete={() => handleDelete(m.id, m.name)}
                        colors={COLORS} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Pending tab */}
        {tab === 'pending' && (
          <>
            {pending.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <h4>No pending approvals</h4>
                <p>All registered users have been reviewed.</p>
              </div>
            ) : (
              <div className="members-grid">
                {pending.map((m, i) => (
                  <div key={m.id} className="member-card" style={{ borderTop: '3px solid var(--warning)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div className="member-avatar" style={{ background: '#d97706' }}>
                        {m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="member-name">{m.name}</div>
                        <div className="member-email">{m.email}</div>
                        {m.position && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{m.position}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <span className="badge" style={{ background: m.email_verified ? '#dcfce7' : '#fef9c3', color: m.email_verified ? '#166534' : '#713f12', fontSize: 11 }}>
                          {m.email_verified ? '✓ Email verified' : '⏳ Email not verified'}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Registered {fmtDate(m.created_at)}</div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => handleApprove(m.id, m.name)}>
                        Approve ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Add member tab */}
        {tab === 'add' && (
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="card-header"><span className="card-title">Add Member Directly</span></div>
            <div className="card-body">
              <div className="notice" style={{ background: 'var(--bg-info)', color: 'var(--text-info)', border: '1px solid var(--border-info)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 20 }}>
                ℹ Accounts created here are immediately active — no email verification needed. Use this for trusted colleagues.
              </div>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Full Name <span className="form-required">*</span></label>
                  <input className="form-input" placeholder="e.g. Dr. Abdul Karim"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address <span className="form-required">*</span></label>
                  <input type="email" className="form-input" placeholder="name@institution.edu"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Position / Designation</label>
                  <input className="form-input" placeholder="e.g. Research Assistant"
                    value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Temporary Password <span className="form-required">*</span></label>
                    <input type="password" className="form-input" placeholder="Min. 8 characters"
                      value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                    <div className="form-hint">Share this securely.</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="member">Researcher</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Account'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Access policy */}
        <div className="card" style={{ marginTop: 28 }}>
          <div className="card-header"><span className="card-title">Access Policy</span></div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-card indigo">
                <div className="info-card-title">⭐ Administrator</div>
                <div className="info-card-body">Manages all projects and members within {user?.org_name}. Cannot see data from other organizations.</div>
              </div>
              <div className="info-card green">
                <div className="info-card-title">👤 Researcher</div>
                <div className="info-card-body">Submits expenses for assigned projects only. Cannot see other researchers' expenses or other organizations.</div>
              </div>
              <div className="info-card amber">
                <div className="info-card-title">🔒 Data Isolation</div>
                <div className="info-card-body">Each workspace is completely private. Nobody outside your workspace can access your data.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit member modal */}
      {editUser && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditUser(null)}>
          <div className="modal">
            <div className="modal-head">
              <h3>Edit Member</h3>
              <button className="modal-close" onClick={() => setEditUser(null)}>×</button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={editUser.name}
                    onChange={e => setEditUser(u => ({ ...u, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Position</label>
                  <input className="form-input" value={editUser.position || ''}
                    onChange={e => setEditUser(u => ({ ...u, position: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={editUser.role}
                    onChange={e => setEditUser(u => ({ ...u, role: e.target.value }))}>
                    <option value="member">Researcher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-outline" onClick={() => setEditUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setResetId(null)}>
          <div className="modal">
            <div className="modal-head">
              <h3>Reset Member Password</h3>
              <button className="modal-close" onClick={() => setResetId(null)}>×</button>
            </div>
            <form onSubmit={handleResetPw}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" placeholder="Min. 8 characters"
                    value={resetPw} onChange={e => setResetPw(e.target.value)} required autoFocus />
                  <div className="form-hint">Share this securely with the member. They can change it from their Profile page.</div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-outline" onClick={() => setResetId(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || resetPw.length < 8}>
                  {saving ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function MemberCard({ m, i, isMe, onEdit, onResetPw, onDelete, onView, colors }) {
  return (
    <div className="member-card" style={{ borderTop: `3px solid ${m.role === 'admin' ? 'var(--accent)' : 'var(--border-strong)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div className="member-avatar" style={{ background: colors[i % colors.length] }}>
          {m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="member-name">{m.name} {isMe && <span style={{ fontSize: 11, color: 'var(--accent)' }}>(you)</span>}</div>
          <div className="member-email">{m.email}</div>
          {m.position && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{m.position}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span className={`badge ${m.role === 'admin' ? 'badge-indigo' : 'badge-gray'}`}>
            {m.role === 'admin' ? '⭐ Admin' : 'Researcher'}
          </span>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Since {fmtDate(m.created_at)}</div>
        </div>
        {!isMe && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-xs" onClick={onView}>Profile</button>
            <button className="btn btn-ghost btn-xs" onClick={onEdit}>Edit</button>
            <button className="btn btn-ghost btn-xs" onClick={onResetPw}>Reset PW</button>
            <button className="btn btn-ghost btn-xs" onClick={onDelete} style={{ color: 'var(--danger)' }}>Remove</button>
          </div>
        )}
      </div>
    </div>
  );
}
