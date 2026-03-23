import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ICONS = {
  dashboard: '▦',
  expenses:  '₿',
  members:   '◈',
};

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Research<br />Tracker</h1>
          <span>FGS · DIU</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Navigation</div>
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            {ICONS.dashboard} Dashboard
          </NavLink>
          <NavLink to="/expenses" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            {ICONS.expenses} Expenses
          </NavLink>
          {isAdmin && (
            <NavLink to="/members" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              {ICONS.members} Members
            </NavLink>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="user-name">{user?.name}</div>
          <div className="user-role">{user?.role}</div>
          <button className="btn-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
