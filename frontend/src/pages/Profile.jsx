import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Profile() {
  const { user, updateUser, isAdmin, workspaceName, reportHeader } = useAuth();

  const [profile, setProfile] = useState({ name: user?.name || '', position: user?.position || '' });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  const [pw, setPw] = useState({ current: '', newpw: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const saveProfile = async e => {
    e.preventDefault(); setProfileMsg({ type: '', text: '' }); setProfileSaving(true);
    try {
      const { data } = await api.patch('/auth/profile', profile);
      updateUser({ name: data.name, position: data.position });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' });
    } finally { setProfileSaving(false); }
  };

  const changePassword = async e => {
    e.preventDefault(); setPwMsg({ type: '', text: '' });
    if (pw.newpw !== pw.confirm) return setPwMsg({ type: 'error', text: 'New passwords do not match.' });
    setPwSaving(true);
    try {
      await api.patch('/auth/change-password', { current_password: pw.current, new_password: pw.newpw });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setPw({ current: '', newpw: '', confirm: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password.' });
    } finally { setPwSaving(false); }
  };

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700, color: '#fff', flexShrink: 0
              }}>{initials}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{user?.email}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <span className={`badge ${isAdmin ? 'badge-indigo' : 'badge-gray'}`}>
                    {isAdmin ? '⭐ Administrator' : '👤 Researcher'}
                  </span>
                  <span className="badge badge-gray">{user?.org_short_name}</span>
                  {user?.position && <span className="badge badge-gray">{user.position}</span>}
                  <span className="badge badge-gray">Member since {user?.created_at ? fmtDate(user.created_at) : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          {/* Edit profile */}
          <div className="card">
            <div className="card-header"><span className="card-title">Edit Profile</span></div>
            <div className="card-body">
              {profileMsg.text && (
                <div className={`notice notice-${profileMsg.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 16 }}>
                  {profileMsg.type === 'success' ? '✓' : '⚠'} {profileMsg.text}
                </div>
              )}
              <form onSubmit={saveProfile}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Position / Designation</label>
                  <input className="form-input" placeholder="e.g. Research Assistant, Associate Professor"
                    value={profile.position}
                    onChange={e => setProfile(p => ({ ...p, position: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" value={user?.email} disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                  <div className="form-hint">Email cannot be changed. Contact your admin.</div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                  {profileSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>

          {/* Change password */}
          <div className="card">
            <div className="card-header"><span className="card-title">Change Password</span></div>
            <div className="card-body">
              {pwMsg.text && (
                <div className={`notice notice-${pwMsg.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 16 }}>
                  {pwMsg.type === 'success' ? '✓' : '⚠'} {pwMsg.text}
                </div>
              )}
              <form onSubmit={changePassword}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-input" placeholder="Your current password"
                    value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" placeholder="Min. 8 characters"
                    value={pw.newpw} onChange={e => setPw(p => ({ ...p, newpw: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-input" placeholder="Repeat new password"
                    value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                  {pwSaving ? 'Changing…' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Organization info */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><span className="card-title">Organization</span></div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-card indigo">
                <div className="info-card-title">🏛️ Organization</div>
                <div className="info-card-body">{workspaceName}</div>
              </div>
              <div className="info-card green">
                <div className="info-card-title">📄 Report Header</div>
                <div className="info-card-body">{reportHeader}</div>
              </div>
              <div className="info-card amber">
                <div className="info-card-title">🔐 Your Role</div>
                <div className="info-card-body">{isAdmin ? 'Admin — full workspace access' : 'Researcher — assigned projects only'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
