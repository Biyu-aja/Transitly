import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const postService = {
  getPosts: async (params?: { lat?: number; lng?: number; radius?: number }) => {
    const response = await api.get('/posts', { params });
    return response.data;
  },
  createPost: async (data: {
    title: string;
    content: string;
    category: string;
    locationLat?: number;
    locationLng?: number;
    locationName?: string;
  }) => {
    const response = await api.post('/posts', data);
    return response.data;
  },
  toggleLike: async (postId: string) => {
    const response = await api.post(`/posts/${postId}/like`);
    return response.data;
  },
  getComments: async (postId: string) => {
    const response = await api.get(`/posts/${postId}/comments`);
    return response.data;
  },
  addComment: async (postId: string, content: string) => {
    const response = await api.post(`/posts/${postId}/comments`, { content });
    return response.data;
  },
};

export const routeService = {
  getRoutes: async () => {
    const response = await api.get('/routes');
    return response.data;
  },
  createRoute: async (data: {
    name: string;
    description?: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    transportModes: string[];
    estimatedTime?: number;
    estimatedCost?: number;
  }) => {
    const response = await api.post('/routes', data);
    return response.data;
  }
};
