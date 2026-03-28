import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If 401, force logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rt_token');
      localStorage.removeItem('rt_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
