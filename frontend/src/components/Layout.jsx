import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

const NAV = [
  { to:'/',         label:'Dashboard',   icon:'📊', end:true },
  { to:'/expenses', label:'Expenses',    icon:'🧾' },
  { to:'/archive',  label:'Archive',     icon:'🗂️' },
  { to:'/profile',  label:'My Profile',  icon:'👤' },
];
const ADMIN_NAV = [
  { to:'/members',  label:'Team Members', icon:'👥' },
  { to:'/invites',  label:'Invitations',  icon:'✉️' },
  { to:'/settings', label:'Workspace',    icon:'⚙️' },
];

export default function Layout() {
  const { user, logout, isAdmin, isSuper, workspaceName, reportHeader } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme]         = useState(() => localStorage.getItem('rt-theme') || 'light');
  const [now, setNow]             = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rt-theme', theme);
  }, [theme]);

  const clockStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const dateStr  = now.toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
  const initials = user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || '?';

  const crumbMap = {
    '/':          ['Overview',        'Dashboard'],
    '/expenses':  ['Overview',        'Expenses'],
    '/members':   ['Administration',  'Team Members'],
    '/profile':   ['Account',         'My Profile'],
    '/settings':  ['Administration',  'Workspace Settings'],
  };
  const crumbs = crumbMap[location.pathname] || ['Overview', 'Page'];

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}
>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo">R</div>
            <div>
              <div className="sidebar-app-name">ResearchTrack</div>
              <div className="sidebar-app-sub">Expense Management</div>
            </div>
          </div>
          {workspaceName && (
            <div className="sidebar-university">
              <div className="sidebar-uni-name">{workspaceName}</div>
              {reportHeader && reportHeader !== workspaceName && (
                <div className="sidebar-uni-dept">{reportHeader}</div>
              )}
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="nav-item-icon">{item.icon}</span>{item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <div className="nav-section-label">Administration</div>
              {ADMIN_NAV.map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
                  <span className="nav-item-icon">{item.icon}</span>{item.label}
                </NavLink>
              ))}
            </>
          )}
          {isSuper && (
            <>
              <div className="nav-section-label">Platform</div>
              <a href="/super" style={{ textDecoration:'none' }}>
                <div className="nav-item">
                  <span className="nav-item-icon">🌐</span>Super Panel
                </div>
              </a>
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">
                {isSuper  ? '🌐 Super Admin' :
                 isAdmin  ? '⭐ Admin'        : '👤 Researcher'}
              </div>
              {user?.position && (
                <div style={{ fontSize:10, color:'var(--text-tertiary)', marginTop:1,
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {user.position}
                </div>
              )}
            </div>
          </div>
          <button className="btn-signout" onClick={() => { logout(); navigate('/login'); }}>
'↩ Sign Out'
          </button>
        </div>

        <div className="sidebar-footer">
          Developed by Tariqul Islam<br />
          ResearchTrack v10 · 2025
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(s=>!s)}>☰</button>
          <div className="topbar-breadcrumb">
            <span>{crumbs[0]}</span><span className="topbar-sep">›</span>
            <span className="current">{crumbs[1]}</span>
          </div>
          <div className="topbar-actions">
            <div className="topbar-clock">
              <span className="topbar-date">{dateStr}</span>
              <span className="topbar-time" style={{ fontVariantNumeric:'tabular-nums' }}>🕐 {clockStr}</span>
            </div>
            <button className="theme-toggle"
              onClick={() => setTheme(t => t==='light' ? 'dark' : 'light')}
              title="Toggle dark mode">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </header>

        <main style={{ flex:1 }}><Outlet /></main>

        <footer className="app-footer">
          <div className="footer-brand">
            <span style={{ fontSize:18 }}>📊</span>
            <div>
              <strong>{workspaceName || 'ResearchTrack'}</strong>
              {reportHeader && reportHeader !== workspaceName && (
                <><span style={{ margin:'0 6px', color:'var(--text-tertiary)' }}>·</span>
                <span>{reportHeader}</span></>
              )}
            </div>
          </div>
          <div className="footer-right">
            ResearchTrack v10 · Developed by Tariqul Islam<br />
            © 2025 · All access is logged and audited
          </div>
        </footer>
      </div>
    </div>
  );
}
