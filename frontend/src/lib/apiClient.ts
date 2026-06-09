import axios from 'axios';
import { useAuthStore } from '../store/authStore';

let BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

if (typeof window !== 'undefined') {
  if (window.location.hostname.includes('onrender.com') || window.location.hostname.includes('frontend-new-7qyz')) {
    BASE_URL = 'https://backend-czdt.onrender.com/api';
  }
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Important to send httpOnly cookies (refreshToken)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach access token
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401s and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token using the httpOnly cookie
        const res = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken, user } = res.data;

        // Update Zustand store
        useAuthStore.getState().login(user, accessToken);

        // Update original request auth header
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, user must login again
        useAuthStore.getState().logout();
        
        // Force redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
