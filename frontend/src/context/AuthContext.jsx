import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rt_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

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
    localStorage.setItem('rt_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('rt_token');
    localStorage.removeItem('rt_user');
    setUser(null);
  };

  const updateUser = (partial) => {
    const updated = { ...user, ...partial };
    setUser(updated);
    localStorage.setItem('rt_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      updateUser,
      isAdmin:       user?.role === 'admin',
      workspaceName: user?.workspace_name  || '',
      reportHeader:  user?.report_header   || '',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
