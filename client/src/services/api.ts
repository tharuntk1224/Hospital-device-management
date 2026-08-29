import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

const apiBase = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiBase,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach Bearer token ─────────────────────────────

api.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — handle 401 (token expiry) ─────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${apiBase}/auth/refresh`, { refreshToken });
          const newToken = res.data?.data?.accessToken;
          if (newToken) {
            localStorage.setItem('accessToken', newToken);
            originalRequest.headers!.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch {
          // Refresh failed — clear auth and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
