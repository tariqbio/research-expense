import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const AUTO_LOGOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('rt_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [isSuperSwitch, setIsSuperSwitch] = useState(false);

  // Auto-logout on inactivity
  useEffect(() => {
    if (!user) return;
    let timer = setTimeout(logout, AUTO_LOGOUT_MS);
    const reset = () => { clearTimeout(timer); timer = setTimeout(logout, AUTO_LOGOUT_MS); };
    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown',   reset);
    window.addEventListener('click',     reset);
    window.addEventListener('touchstart',reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown',   reset);
      window.removeEventListener('click',     reset);
      window.removeEventListener('touchstart',reset);
    };
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('rt_token');
    if (token) {
      api.get('/auth/me')
        .then(r => {
          setUser(r.data);
          localStorage.setItem('rt_user', JSON.stringify(r.data));
          // Check if this is a super-switch token
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setIsSuperSwitch(!!payload.is_super_switch);
          } catch {}
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('rt_token', data.token);
    localStorage.setItem('rt_user',  JSON.stringify(data.user));
    setUser(data.user);
    setIsSuperSwitch(false);
    return data.user;
  };

  const logout = useCallback(() => {
    // If super-switch, restore original superadmin token
    const originalToken = localStorage.getItem('rt_super_token');
    const originalUser  = localStorage.getItem('rt_super_user');
    if (originalToken && originalUser) {
      localStorage.setItem('rt_token', originalToken);
      localStorage.setItem('rt_user',  originalUser);
      localStorage.removeItem('rt_super_token');
      localStorage.removeItem('rt_super_user');
      setUser(JSON.parse(originalUser));
      setIsSuperSwitch(false);
      window.location.href = '/super';
    } else {
      localStorage.removeItem('rt_token');
      localStorage.removeItem('rt_user');
      setUser(null);
      setIsSuperSwitch(false);
    }
  }, []);

  const switchToWorkspace = async (workspaceId) => {
    // Store current superadmin credentials before switching
    localStorage.setItem('rt_super_token', localStorage.getItem('rt_token'));
    localStorage.setItem('rt_super_user',  localStorage.getItem('rt_user'));

    const { data } = await api.post(`/super/switch/${workspaceId}`);
    localStorage.setItem('rt_token', data.token);
    const newUser = { ...user, ...data.workspace,
      workspace_id: workspaceId, workspace_name: data.workspace.name,
      report_header: data.workspace.report_header, role: 'admin' };
    localStorage.setItem('rt_user', JSON.stringify(newUser));
    setUser(newUser);
    setIsSuperSwitch(true);
    window.location.href = '/';
  };

  const updateUser = (partial) => {
    const updated = { ...user, ...partial };
    setUser(updated);
    localStorage.setItem('rt_user', JSON.stringify(updated));
  };

  const isSuper = user?.role === 'superadmin';
  const isAdmin = ['admin','superadmin'].includes(user?.role) || isSuperSwitch;

  return (
    <AuthContext.Provider value={{
      user, login, logout, loading, updateUser,
      isAdmin, isSuper, isSuperSwitch, switchToWorkspace,
      workspaceName: user?.workspace_name  || '',
      reportHeader:  user?.report_header   || '',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
