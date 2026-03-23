import { useState, useEffect } from 'react';
import api from '../api';

export default function Members() {
  const [members, setMembers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ name: '', email: '', password: '', role: 'member' });
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/auth/users');
      setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.name || !form.email || !form.password)
      return setError('All fields are required');
    if (form.password.length < 8)
      return setError('Password must be at least 8 characters');

    setSaving(true);
    try {
      await api.post('/auth/users', form);
      setSuccess(`Account created for ${form.name}. They can now log in.`);
      setForm({ name: '', email: '', password: '', role: 'member' });
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name}'s account? This cannot be undone.`)) return;
    try {
      await api.delete(`/auth/users/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete user');
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Team Members</h2>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {members.length} account{members.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); setSuccess(''); }}>
          + Add Member
        </button>
      </div>

      <div className="page-body">
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card">
          <div className="card-header"><h3>All Accounts</h3></div>
          {loading ? (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 500 }}>{m.name}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>{m.email}</td>
                      <td>
                        <span className={`badge ${m.role === 'admin' ? 'badge-blue' : 'badge-gray'}`}>
                          {m.role}
                        </span>
                      </td>
                      <td className="date-cell">{fmtDate(m.created_at)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {m.role !== 'admin' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(m.id, m.name)}
                            style={{ color: 'var(--red)' }}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3>About Access Control</h3></div>
          <div className="card-body" style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>
            <p><strong style={{ color: 'var(--text)' }}>Admin</strong> — Can create projects, add members to projects, view all expenses across all projects, and mark expenses as reimbursed. Only admins can change reimbursement status.</p>
            <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Member</strong> — Can submit expenses for projects they are assigned to. Can view and delete their own non-reimbursed expenses. Cannot change payment status.</p>
            <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Security note</strong> — Once an expense is marked as reimbursed, it is permanently locked. It cannot be edited or deleted by anyone. All reimbursement actions are permanently logged with timestamp and who approved it.</p>
          </div>
        </div>
      </div>

      {/* Create member modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Create Member Account</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" placeholder="e.g. Dr. Rahman" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" placeholder="member@diu.edu" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  <div className="form-hint">This will be their login email.</div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Temporary Password</label>
                    <input type="password" className="form-input" placeholder="Min. 8 characters" value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                    <div className="form-hint">Share this securely. They should change it.</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
