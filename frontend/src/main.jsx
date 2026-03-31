import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login          from './pages/Login';
import RequestAccess  from './pages/RequestAccess';
import JoinViaLink    from './pages/JoinViaLink';
import JoinViaCode    from './pages/JoinViaCode';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import VerifyEmail    from './pages/VerifyEmail';
import Dashboard      from './pages/Dashboard';
import ProjectDetail  from './pages/ProjectDetail';
import Expenses       from './pages/Expenses';
import Members        from './pages/Members';
import MemberProfile  from './pages/MemberProfile';
import Invites        from './pages/Invites';
import Profile        from './pages/Profile';
import Settings       from './pages/Settings';
import SuperAdmin     from './pages/SuperAdmin';
import Layout         from './components/Layout';
import './styles.css';

// Shows spinner while auth loads, then routes correctly
function AuthGate({ children }) {
  const { loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return children;
}

// Must be logged in. Superadmin is redirected to /super.
function ProtectedRoute({ children, adminOnly=false }) {
  const { user, isAdmin, isSuper } = useAuth();
  if (!user)              return <Navigate to="/login" replace />;
  if (isSuper)            return <Navigate to="/super" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

// Must be logged in as superadmin
function SuperRoute({ children }) {
  const { user, isSuper } = useAuth();
  if (!user)    return <Navigate to="/login" replace />;
  if (!isSuper) return <Navigate to="/" replace />;
  return children;
}

// Must NOT be logged in
function PublicRoute({ children }) {
  const { user, isSuper } = useAuth();
  if (user) return <Navigate to={isSuper ? '/super' : '/'} replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AuthGate>
          <Routes>
            {/* Public — no auth needed */}
            <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/request-access"  element={<PublicRoute><RequestAccess /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/reset-password"  element={<ResetPassword />} />
            <Route path="/verify-email"    element={<VerifyEmail />} />
            <Route path="/join"            element={<JoinViaLink />} />
            <Route path="/code/:code"      element={<JoinViaCode />} />

            {/* Superadmin only */}
            <Route path="/super"         element={<SuperRoute><SuperAdmin /></SuperRoute>} />
            <Route path="/super/profile" element={<SuperRoute><SuperProfile /></SuperRoute>} />

            {/* Regular app — superadmin is redirected away by ProtectedRoute */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index                element={<Dashboard />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="expenses"     element={<Expenses />} />
              <Route path="profile"      element={<Profile />} />
              <Route path="members"      element={<ProtectedRoute adminOnly><Members /></ProtectedRoute>} />
              <Route path="members/:id"  element={<ProtectedRoute adminOnly><MemberProfile /></ProtectedRoute>} />
              <Route path="invites"      element={<ProtectedRoute adminOnly><Invites /></ProtectedRoute>} />
              <Route path="settings"     element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
