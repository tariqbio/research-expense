import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login          from './pages/Login';
import Register       from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import VerifyEmail    from './pages/VerifyEmail';
import Dashboard      from './pages/Dashboard';
import ProjectDetail  from './pages/ProjectDetail';
import Expenses       from './pages/Expenses';
import Members        from './pages/Members';
import Profile        from './pages/Profile';
import Settings       from './pages/Settings';
import SuperAdmin     from './pages/SuperAdmin';
import Layout         from './components/Layout';
import './styles.css';

function ProtectedRoute({ children, adminOnly=false, superOnly=false }) {
  const { user, loading, isAdmin, isSuper } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (superOnly  && !isSuper) return <Navigate to="/"     replace />;
  if (adminOnly  && !isAdmin) return <Navigate to="/"     replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading, isSuper } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (user) return <Navigate to={isSuper ? '/super' : '/'} replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/verify-email"    element={<VerifyEmail />} />

          {/* Superadmin panel — no Layout wrapper, its own full page */}
          <Route path="/super" element={
            <ProtectedRoute superOnly>
              <SuperAdmin />
            </ProtectedRoute>
          } />

          {/* Regular app */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index                element={<Dashboard />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="expenses"     element={<Expenses />} />
            <Route path="profile"      element={<Profile />} />
            <Route path="members"      element={<ProtectedRoute adminOnly><Members /></ProtectedRoute>} />
            <Route path="settings"     element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
