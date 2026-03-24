import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || '?';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">🎓</div>
          <h1>Research Expense<br />Tracker</h1>
          <div className="org-tag">🏛 FGS · DIU</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Main Menu</div>
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-link-icon">📊</span> Dashboard
          </NavLink>
          <NavLink to="/expenses" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-link-icon">🧾</span> Expenses
          </NavLink>
          {isAdmin && (
            <NavLink to="/members" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <span className="nav-link-icon">👥</span> Members
            </NavLink>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            ↩ Sign Out
          </button>
        </div>

        <div className="sidebar-footer">
          © 2025 DIU · FGS
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
