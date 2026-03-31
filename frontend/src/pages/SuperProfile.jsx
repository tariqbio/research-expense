import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function SuperProfile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ name: user?.name || '' });
  const [profileMsg, setProfileMsg] = useState({ type:'', text:'' });
  const [profileSaving, setProfileSaving] = useState(false);

  const [pw, setPw]       = useState({ current:'', newpw:'', confirm:'' });
  const [pwMsg, setPwMsg] = useState({ type:'', text:'' });
  const [pwSaving, setPwSaving] = useState(false);

  const [email, setEmail]     = useState({ new_email:'', password:'' });
  const [emailMsg, setEmailMsg] = useState({ type:'', text:'' });
  const [emailSaving, setEmailSaving] = useState(false);

  const saveProfile = async e => {
    e.preventDefault(); setProfileMsg({ type:'', text:'' }); setProfileSaving(true);
    try {
      const { data } = await api.patch('/auth/profile', profile);
      updateUser(data);
      setProfileMsg({ type:'success', text:'Name updated.' });
    } catch(err) {
      setProfileMsg({ type:'error', text: err.response?.data?.error || 'Failed.' });
    } finally { setProfileSaving(false); }
  };

  const changePassword = async e => {
    e.preventDefault(); setPwMsg({ type:'', text:'' });
    if (pw.newpw !== pw.confirm) return setPwMsg({ type:'error', text:'Passwords do not match.' });
    setPwSaving(true);
    try {
      await api.patch('/auth/change-password', { current_password:pw.current, new_password:pw.newpw });
      setPwMsg({ type:'success', text:'Password changed.' });
      setPw({ current:'', newpw:'', confirm:'' });
    } catch(err) {
      setPwMsg({ type:'error', text: err.response?.data?.error || 'Failed.' });
    } finally { setPwSaving(false); }
  };

  const changeEmail = async e => {
    e.preventDefault(); setEmailMsg({ type:'', text:'' }); setEmailSaving(true);
    try {
      await api.patch('/auth/change-email', email);
      setEmailMsg({ type:'success', text:'Email updated. Please sign in again.' });
      setTimeout(() => { logout(); navigate('/login'); }, 2000);
    } catch(err) {
      setEmailMsg({ type:'error', text: err.response?.data?.error || 'Failed.' });
    } finally { setEmailSaving(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)' }}>
      {/* Top bar */}
      <div style={{
        background:'var(--bg-surface)', borderBottom:'1px solid var(--border)',
        padding:'0 28px', display:'flex', alignItems:'center',
        justifyContent:'space-between', height:60,
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/super')}>
          ← Back to Panel
        </button>
        <span style={{ fontSize:13, color:'var(--text-secondary)', fontWeight:600 }}>
          Super Admin Profile
        </span>
        <div />
      </div>

      <div style={{ padding:'28px', maxWidth:680, margin:'0 auto' }}>
        <div style={{ marginBottom:24 }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700 }}>Account Settings</h1>
          <p style={{ margin:'4px 0 0', color:'var(--text-secondary)', fontSize:13 }}>
            Manage your super admin credentials
          </p>
        </div>

        {/* Name */}
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-header"><span className="card-title">Display Name</span></div>
          <div className="card-body">
            {profileMsg.text && (
              <div className={`notice notice-${profileMsg.type === 'success' ? 'success':'error'}`}
                style={{ marginBottom:14 }}>
                {profileMsg.type === 'success' ? '✓' : '⚠'} {profileMsg.text}
              </div>
            )}
            <form onSubmit={saveProfile}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={profile.name}
                  onChange={e => setProfile({ name:e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                {profileSaving ? 'Saving…' : 'Save Name'}
              </button>
            </form>
          </div>
        </div>

        {/* Change email */}
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-header"><span className="card-title">Change Email</span></div>
          <div className="card-body">
            <div className="notice" style={{
              background:'var(--bg-info)', color:'var(--text-info)',
              border:'1px solid var(--border-info)', borderRadius:8,
              padding:'10px 14px', fontSize:13, marginBottom:16,
            }}>
              ℹ Changing your email will sign you out. You will need to sign in with the new email.
            </div>
            {emailMsg.text && (
              <div className={`notice notice-${emailMsg.type === 'success' ? 'success':'error'}`}
                style={{ marginBottom:14 }}>
                {emailMsg.type === 'success' ? '✓' : '⚠'} {emailMsg.text}
              </div>
            )}
            <form onSubmit={changeEmail}>
              <div className="form-group">
                <label className="form-label">Current Email</label>
                <input className="form-input" value={user?.email} disabled
                  style={{ opacity:0.6, cursor:'not-allowed' }} />
              </div>
              <div className="form-group">
                <label className="form-label">New Email</label>
                <input type="email" className="form-input" placeholder="new@email.com"
                  value={email.new_email}
                  onChange={e => setEmail(em => ({ ...em, new_email:e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm with Password</label>
                <input type="password" className="form-input" placeholder="Your current password"
                  value={email.password}
                  onChange={e => setEmail(em => ({ ...em, password:e.target.value }))} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={emailSaving}>
                {emailSaving ? 'Updating…' : 'Change Email'}
              </button>
            </form>
          </div>
        </div>

        {/* Change password */}
        <div className="card">
          <div className="card-header"><span className="card-title">Change Password</span></div>
          <div className="card-body">
            {pwMsg.text && (
              <div className={`notice notice-${pwMsg.type === 'success' ? 'success':'error'}`}
                style={{ marginBottom:14 }}>
                {pwMsg.type === 'success' ? '✓' : '⚠'} {pwMsg.text}
              </div>
            )}
            <form onSubmit={changePassword}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" className="form-input"
                  value={pw.current} onChange={e=>setPw(p=>({...p,current:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" placeholder="Min. 8 characters"
                  value={pw.newpw} onChange={e=>setPw(p=>({...p,newpw:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-input"
                  value={pw.confirm} onChange={e=>setPw(p=>({...p,confirm:e.target.value}))} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                {pwSaving ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
