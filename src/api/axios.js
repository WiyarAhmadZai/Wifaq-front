import axios from 'axios';

// Create axios instance with base URL and timeout
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 15000, // 15s timeout — prevents hanging requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Track in-flight GET requests for deduplication
const pendingRequests = new Map();

// Request interceptor: auth token + deduplication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Deduplicate identical GET requests
    if (config.method === 'get') {
      const key = config.url + JSON.stringify(config.params || {});
      if (pendingRequests.has(key)) {
        const controller = new AbortController();
        controller.abort();
        config.signal = controller.signal;
      } else {
        const controller = new AbortController();
        config.signal = config.signal || controller.signal;
        config._dedupeKey = key;
        pendingRequests.set(key, controller);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: error handling + cleanup
api.interceptors.response.use(
  (response) => {
    if (response.config._dedupeKey) {
      pendingRequests.delete(response.config._dedupeKey);
    }
    return response;
  },
  (error) => {
    if (error.config?._dedupeKey) {
      pendingRequests.delete(error.config._dedupeKey);
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Export the configured axios instance
export default api;

// Export API base URL for constructing storage URLs
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Export common HTTP methods
export const get = (url, config = {}) => api.get(url, config);
export const post = (url, data = {}, config = {}) => api.post(url, data, config);
export const put = (url, data = {}, config = {}) => api.put(url, data, config);
export const patch = (url, data = {}, config = {}) => api.patch(url, data, config);
export const del = (url, config = {}) => api.delete(url, config);
