import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);
const AUTO_LOGOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('rt_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Auto-logout on inactivity
  useEffect(() => {
    if (!user) return;
    let timer = setTimeout(logout, AUTO_LOGOUT_MS);
    const reset = () => { clearTimeout(timer); timer = setTimeout(logout, AUTO_LOGOUT_MS); };
    const events = ['mousemove','keydown','click','touchstart'];
    events.forEach(e => window.addEventListener(e, reset));
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('rt_token');
    if (token) {
      api.get('/auth/me')
        .then(r => { setUser(r.data); localStorage.setItem('rt_user', JSON.stringify(r.data)); })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('rt_token', data.token);
    localStorage.setItem('rt_user',  JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('rt_token');
    localStorage.removeItem('rt_user');
    setUser(null);
  }, []);

  const updateUser = (partial) => {
    const updated = { ...user, ...partial };
    setUser(updated);
    localStorage.setItem('rt_user', JSON.stringify(updated));
  };

  const isSuper = user?.role === 'superadmin';
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);

  return (
    <AuthContext.Provider value={{
      user, login, logout, loading, updateUser,
      isAdmin, isSuper,
      workspaceName: user?.workspace_name || '',
      reportHeader:  user?.report_header  || '',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
