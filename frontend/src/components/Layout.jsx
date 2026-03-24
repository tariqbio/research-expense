import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/expenses', label: 'Expenses', icon: '🧾' },
];
const ADMIN_NAV = [
  { to: '/members', label: 'Members', icon: '👥' },
];

const BREADCRUMBS = {
  '/': ['Overview', 'Dashboard'],
  '/expenses': ['Overview', 'Expenses'],
  '/members': ['Overview', 'Members'],
};

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('rt-theme') || 'light');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const clockStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr  = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rt-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const crumbs = BREADCRUMBS[location.pathname] || ['Overview', 'Page'];

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo">R</div>
            <div>
              <div className="sidebar-app-name">ResearchTrack</div>
              <div className="sidebar-app-sub">Expense Management System</div>
            </div>
          </div>
          <div className="sidebar-university">
            <div className="sidebar-uni-name">Daffodil International University</div>
            <div className="sidebar-uni-dept">Faculty of Graduate Studies (FGS)</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="nav-section-label">Administration</div>
              {ADMIN_NAV.map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
                  <span className="nav-item-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role === 'admin' ? '⭐ Administrator' : '👤 Researcher'}</div>
            </div>
          </div>
          <button className="btn-signout" onClick={() => { logout(); navigate('/login'); }}>
            ↩ Sign Out
          </button>
        </div>

        <div className="sidebar-footer">
          Developed by Tariqul Islam<br />
          FGS · DIU · 2025
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-wrapper">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <span>{crumbs[0]}</span>
            <span className="topbar-sep">›</span>
            <span className="current">{crumbs[1]}</span>
          </div>
          <div className="topbar-actions">
            <div className="topbar-clock">
              <span className="topbar-date">{dateStr}</span>
              <span className="topbar-time" style={{ fontVariantNumeric: 'tabular-nums' }}>🕐 {clockStr}</span>
            </div>
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle dark mode">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </header>

        <main style={{ flex: 1 }}>
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <div className="footer-brand">
            <span style={{ fontSize: 18 }}>🎓</span>
            <div>
              <strong>Daffodil International University</strong>
              <span style={{ margin: '0 6px', color: 'var(--text-tertiary)' }}>·</span>
              <span>Faculty of Graduate Studies</span>
            </div>
          </div>
          <div className="footer-right">
            ResearchTrack v2.0 · Developed by Tariqul Islam<br />
            © 2025 FGS, DIU · All access is logged and audited
          </div>
        </footer>
      </div>
    </div>
  );
}
