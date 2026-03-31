import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',
  { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleString('en-GB',
  { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'Never';

export default function MemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get(`/auth/users/${id}/profile`)
      .then(r => setMember(r.data))
      .catch(e => setError(e.response?.data?.error || 'Could not load profile'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (error)   return (
    <div className="page-body">
      <div className="notice notice-error">⚠ {error}</div>
      <button className="btn btn-outline btn-sm" style={{ marginTop:12 }} onClick={() => navigate('/members')}>
        ← Back to Members
      </button>
    </div>
  );

  const initials = member.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);

  const fields = [
    { label:'Email',         value: member.email },
    { label:'Designation',   value: member.designation },
    { label:'Position',      value: member.position },
    { label:'Gender',        value: member.gender },
    { label:'Blood Type',    value: member.blood_type },
    { label:'Phone',         value: member.phone },
    { label:'Location',      value: member.location },
    { label:'Date of Birth', value: fmtDate(member.date_of_birth) },
    { label:'Member Since',  value: fmtDate(member.created_at) },
    { label:'Last Active',   value: fmtTime(member.last_active) },
  ].filter(f => f.value && f.value !== '—');

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" style={{ marginBottom:8 }}
            onClick={() => navigate('/members')}>
            ← Back to Members
          </button>
          <div className="page-eyebrow">Team Member</div>
          <h1 className="page-title">{member.name}</h1>
          <p className="page-subtitle">
            {[member.designation, member.position].filter(Boolean).join(' · ') || 'Member'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-outline btn-sm"
            onClick={() => navigate('/members')}>
            Edit in Members →
          </button>
        )}
      </div>

      <div className="page-body">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
          {/* Identity card */}
          <div className="card">
            <div className="card-body" style={{ textAlign:'center', padding:32 }}>
              <div style={{
                width:80, height:80, borderRadius:'50%',
                background: member.avatar_url ? 'transparent' : 'var(--accent)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:28, fontWeight:700, color:'#fff',
                margin:'0 auto 16px', overflow:'hidden',
                border:'3px solid var(--border)',
              }}>
                {member.avatar_url
                  ? <img src={member.avatar_url} alt={member.name}
                      style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : initials}
              </div>
              <div style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)' }}>
                {member.name}
              </div>
              <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:4 }}>
                {member.email}
              </div>
              <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:12, flexWrap:'wrap' }}>
                <span className={`badge ${member.role==='admin' ? 'badge-indigo':'badge-gray'}`}>
                  {member.role === 'admin' ? '⭐ Admin' : '👤 Researcher'}
                </span>
                {member.blood_type && (
                  <span className="badge badge-gray">🩸 {member.blood_type}</span>
                )}
                {member.gender && (
                  <span className="badge badge-gray">{member.gender}</span>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="card">
            <div className="card-header"><span className="card-title">Profile Details</span></div>
            <div className="card-body">
              {fields.length === 0 ? (
                <div style={{ color:'var(--text-tertiary)', fontSize:13 }}>
                  This member hasn't filled in their profile yet.
                </div>
              ) : (
                <div style={{ display:'grid', gap:0 }}>
                  {fields.map((f, i) => (
                    <div key={i} style={{
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'10px 0', borderBottom:'1px solid var(--border-tertiary)',
                    }}>
                      <span style={{ fontSize:12, color:'var(--text-tertiary)', fontWeight:600,
                                     textTransform:'uppercase', letterSpacing:'0.04em' }}>
                        {f.label}
                      </span>
                      <span style={{ fontSize:14, color:'var(--text-primary)', textAlign:'right' }}>
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
