import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const AUTO_LOGOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('rt_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);


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
  const isSuperSwitch = false;
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
