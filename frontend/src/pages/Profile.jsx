import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const GENDERS = ['Male','Female','Other','Prefer not to say'];

export default function Profile() {
  const { user, updateUser, isAdmin, workspaceName, reportHeader } = useAuth();

  const [profile, setProfile] = useState({
    name:          user?.name          || '',
    position:      user?.position      || '',
    designation:   user?.designation   || '',
    gender:        user?.gender        || '',
    blood_type:    user?.blood_type    || '',
    location:      user?.location      || '',
    phone:         user?.phone         || '',
    date_of_birth: user?.date_of_birth ? user.date_of_birth.split('T')[0] : '',
  });
  const [profileMsg,   setProfileMsg]   = useState({ type:'', text:'' });
  const [profileSaving,setProfileSaving]= useState(false);

  const [pw, setPw]       = useState({ current:'', newpw:'', confirm:'' });
  const [pwMsg, setPwMsg] = useState({ type:'', text:'' });
  const [pwSaving, setPwSaving] = useState(false);

  const initials = user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || '?';

  const saveProfile = async e => {
    e.preventDefault(); setProfileMsg({ type:'', text:'' }); setProfileSaving(true);
    try {
      const { data } = await api.patch('/auth/profile', profile);
      updateUser(data);
      setProfileMsg({ type:'success', text:'Profile updated.' });
    } catch (err) {
      setProfileMsg({ type:'error', text: err.response?.data?.error || 'Failed.' });
    } finally { setProfileSaving(false); }
  };

  const changePassword = async e => {
    e.preventDefault(); setPwMsg({ type:'', text:'' });
    if (pw.newpw !== pw.confirm) return setPwMsg({ type:'error', text:'New passwords do not match.' });
    setPwSaving(true);
    try {
      await api.patch('/auth/change-password', { current_password: pw.current, new_password: pw.newpw });
      setPwMsg({ type:'success', text:'Password changed successfully.' });
      setPw({ current:'', newpw:'', confirm:'' });
    } catch (err) {
      setPwMsg({ type:'error', text: err.response?.data?.error || 'Failed.' });
    } finally { setPwSaving(false); }
  };


  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) return alert('Image must be under 500KB');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      setAvatarPreview(b64);
      setProfile(p => ({ ...p, avatar_url: b64 }));
    };
    reader.readAsDataURL(file);
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',
    { day:'2-digit', month:'short', year:'numeric' }) : '—';

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-eyebrow">Account</div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">{workspaceName} · {user?.role === 'admin' ? 'Administrator' : 'Researcher'}</p>
        </div>
      </div>

      <div className="page-body">
        {/* Identity card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
              <div style={{
                width:72, height:72, borderRadius:'50%', background:'var(--accent)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:26, fontWeight:700, color:'#fff', flexShrink:0,
                overflow:'hidden', cursor:'pointer', position:'relative',
              }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="avatar"
                      style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : initials}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:22, fontWeight:700, color:'var(--text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:2 }}>{user?.email}</div>
                {(user?.designation || user?.position) && (
                  <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:2 }}>
                    {[user?.designation, user?.position].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                  <span className={`badge ${isAdmin ? 'badge-indigo' : 'badge-gray'}`}>
                    {isAdmin ? '⭐ Admin' : '👤 Researcher'}
                  </span>
                  {user?.gender     && <span className="badge badge-gray">{user.gender}</span>}
                  {user?.blood_type && <span className="badge badge-gray">🩸 {user.blood_type}</span>}
                  {user?.location   && <span className="badge badge-gray">📍 {user.location}</span>}
                  {user?.phone      && <span className="badge badge-gray">📞 {user.phone}</span>}
                  {user?.date_of_birth && <span className="badge badge-gray">🎂 {fmtDate(user.date_of_birth)}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:20 }}>
          {/* Edit profile */}
          <div className="card">
            <div className="card-header"><span className="card-title">Personal Information</span></div>
            <div className="card-body">
              {profileMsg.text && (
                <div className={`notice notice-${profileMsg.type === 'success' ? 'success' : 'error'}`}
                  style={{ marginBottom:16 }}>
                  {profileMsg.type === 'success' ? '✓' : '⚠'} {profileMsg.text}
                </div>
              )}
              <form onSubmit={saveProfile}>
                <div className="form-group">
                  <label className="form-label">Profile Photo</label>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                    {avatarPreview && (
                      <img src={avatarPreview} alt="preview"
                        style={{ width:48, height:48, borderRadius:'50%', objectFit:'cover',
                                 border:'2px solid var(--border)' }} />
                    )}
                    <div>
                      <input type="file" accept="image/*" id="avatar-upload"
                        style={{ display:'none' }} onChange={handleAvatarChange} />
                      <label htmlFor="avatar-upload" className="btn btn-outline btn-sm"
                        style={{ cursor:'pointer' }}>
                        {avatarPreview ? '📷 Change Photo' : '📷 Upload Photo'}
                      </label>
                      {avatarPreview && (
                        <button type="button" className="btn btn-ghost btn-sm"
                          style={{ marginLeft:8, color:'var(--danger)' }}
                          onClick={() => { setAvatarPreview(''); setProfile(p=>({...p,avatar_url:''})); }}>
                          Remove
                        </button>
                      )}
                      <div className="form-hint" style={{ marginTop:4 }}>Max 500KB. JPG or PNG.</div>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                <label className="form-label">Full Name</label>
                  <input className="form-input" value={profile.name}
                    onChange={e => setProfile(p=>({...p, name:e.target.value}))} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <input className="form-input" placeholder="e.g. Research Fellow"
                      value={profile.designation}
                      onChange={e => setProfile(p=>({...p, designation:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Position</label>
                    <input className="form-input" placeholder="e.g. Project Coordinator"
                      value={profile.position}
                      onChange={e => setProfile(p=>({...p, position:e.target.value}))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-select" value={profile.gender}
                      onChange={e => setProfile(p=>({...p, gender:e.target.value}))}>
                      <option value="">Select…</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Type</label>
                    <select className="form-select" value={profile.blood_type}
                      onChange={e => setProfile(p=>({...p, blood_type:e.target.value}))}>
                      <option value="">Select…</option>
                      {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" placeholder="+880 1xxx xxxxxx"
                      value={profile.phone}
                      onChange={e => setProfile(p=>({...p, phone:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input" value={profile.date_of_birth}
                      onChange={e => setProfile(p=>({...p, date_of_birth:e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" placeholder="e.g. Dhaka, Bangladesh"
                    value={profile.location}
                    onChange={e => setProfile(p=>({...p, location:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" value={user?.email} disabled
                    style={{ opacity:0.6, cursor:'not-allowed' }} />
                  <div className="form-hint">Email cannot be changed. Contact your admin.</div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                  {profileSaving ? 'Saving…' : 'Save Profile'}
                </button>
              </form>
            </div>
          </div>

          {/* Change password */}
          <div className="card">
            <div className="card-header"><span className="card-title">Change Password</span></div>
            <div className="card-body">
              {pwMsg.text && (
                <div className={`notice notice-${pwMsg.type === 'success' ? 'success' : 'error'}`}
                  style={{ marginBottom:16 }}>
                  {pwMsg.type === 'success' ? '✓' : '⚠'} {pwMsg.text}
                </div>
              )}
              <form onSubmit={changePassword}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-input" placeholder="Your current password"
                    value={pw.current} onChange={e=>setPw(p=>({...p,current:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" placeholder="Min. 8 characters"
                    value={pw.newpw} onChange={e=>setPw(p=>({...p,newpw:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-input" placeholder="Repeat new password"
                    value={pw.confirm} onChange={e=>setPw(p=>({...p,confirm:e.target.value}))} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                  {pwSaving ? 'Changing…' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Workspace info */}
        <div className="card" style={{ marginTop:20 }}>
          <div className="card-header"><span className="card-title">Workspace</span></div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-card indigo">
                <div className="info-card-title">🏠 Workspace</div>
                <div className="info-card-body">{workspaceName || '—'}</div>
              </div>
              <div className="info-card green">
                <div className="info-card-title">📄 Report Header</div>
                <div className="info-card-body">{reportHeader || workspaceName || '—'}</div>
              </div>
              <div className="info-card amber">
                <div className="info-card-title">🔐 Role</div>
                <div className="info-card-body">
                  {isAdmin ? 'Admin — full workspace access' : 'Researcher — assigned projects only'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
