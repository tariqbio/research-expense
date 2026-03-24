import { useState, useEffect } from 'react';
import api from '../api';

const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

export default function Members() {
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState({ name:'', email:'', password:'', role:'member' });
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [saving, setSaving]     = useState(false);

  const load = async () => {
    try { const { data } = await api.get('/auth/users'); setMembers(data); }
    catch(err) { console.error(err); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async e => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!form.name || !form.email || !form.password) return setError('All fields are required');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setSaving(true);
    try {
      await api.post('/auth/users', form);
      setSuccess(`✅ Account created for ${form.name}.`);
      setForm({ name:'', email:'', password:'', role:'member' });
      setShowModal(false); load();
    } catch(err) { setError(err.response?.data?.error || 'Failed to create account'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove ${name}'s account? This cannot be undone.`)) return;
    try { await api.delete(`/auth/users/${id}`); load(); }
    catch(err) { alert(err.response?.data?.error || 'Could not delete user'); }
  };

  const admins  = members.filter(m => m.role === 'admin');
  const regular = members.filter(m => m.role !== 'admin');

  return (
    <>
      <div className="page-header">
        <div>
          <h2>👥 Team Members</h2>
          <div className="page-sub">{members.length} account{members.length !== 1 ? 's' : ''} · {admins.length} admin{admins.length !== 1 ? 's' : ''} · {regular.length} member{regular.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); setSuccess(''); }}>＋ Add Member</button>
      </div>

      <div className="page-body">
        {success && <div className="alert alert-success">{success}</div>}

        {/* Members grid */}
        <div style={{ display:'grid', gap:16, gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', marginBottom:24 }}>
          {members.map((m, i) => (
            <div key={m.id} className="card" style={{ padding:20, animation:`fadeUp 0.4s ${i*0.05}s both` }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{
                  width:44, height:44,
                  background: m.role === 'admin'
                    ? 'linear-gradient(135deg,#2563eb,#7c3aed)'
                    : 'linear-gradient(135deg,#059669,#10b981)',
                  borderRadius:12,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:16, fontWeight:800, color:'#fff',
                  boxShadow: m.role === 'admin' ? '0 4px 14px rgba(37,99,235,0.3)' : '0 4px 14px rgba(16,185,129,0.3)',
                  flexShrink:0,
                }}>
                  {m.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.name}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.email}</div>
                </div>
                <span className={`badge ${m.role === 'admin' ? 'badge-blue' : 'badge-green'}`}>
                  {m.role === 'admin' ? '⭐ Admin' : '👤 Member'}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:10.5, color:'var(--text3)', fontFamily:'var(--mono)' }}>Joined {fmtDate(m.created_at)}</div>
                {m.role !== 'admin' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(m.id, m.name)}
                    style={{ color:'var(--red)', borderColor:'rgba(239,68,68,0.2)', fontSize:11 }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Access info card */}
        <div className="card">
          <div className="card-header"><h3>🔐 Access Control Policy</h3></div>
          <div className="card-body">
            <div style={{ display:'grid', gap:14, gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))' }}>
              {[
                { icon:'⭐', title:'Admin', color:'var(--blue)', desc:'Create projects, add members, view all expenses, mark reimbursements, manage team accounts.' },
                { icon:'👤', title:'Member', color:'var(--green)', desc:'Submit expenses for assigned projects, view and delete own non-reimbursed expenses.' },
                { icon:'🔒', title:'Audit Lock', color:'var(--purple)', desc:'Once reimbursed, expenses are permanently locked. All actions are logged with timestamp.' },
              ].map(item => (
                <div key={item.title} style={{ padding:16, background:'rgba(99,149,255,0.04)', border:'1px solid var(--border)', borderRadius:'var(--r)' }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>{item.icon}</div>
                  <div style={{ fontWeight:700, fontSize:13, color:item.color, marginBottom:6 }}>{item.title}</div>
                  <div style={{ fontSize:12.5, color:'var(--text2)', lineHeight:1.7 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>👤 Create Member Account</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" placeholder="e.g. Dr. Rahman" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" placeholder="member@diu.edu.bd" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required />
                  <div className="form-hint">This will be their login email.</div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Temporary Password</label>
                    <input type="password" className="form-input" placeholder="Min. 8 characters" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} required />
                    <div className="form-hint">Share this securely with the member.</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
                      <option value="member">👤 Member</option>
                      <option value="admin">⭐ Admin</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : '→ Create Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
