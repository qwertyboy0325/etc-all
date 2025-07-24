// API configuration and utilities
import { apiConfig, isMockOnlyMode } from '../config/api';

export const API_BASE_URL = 'http://localhost:8000/api/v1';

// Auth token helpers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// API response wrapper with mode control
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const config = apiConfig.getConfig();
  
  // Skip real API if in mock-only mode
  if (isMockOnlyMode()) {
    throw new Error('Mock-only mode: Real API disabled');
  }
  
  const url = `${config.baseUrl}${endpoint}`;
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'API Error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Smart API call that respects the current mode
export const smartApiCall = async <T>(
  endpoint: string, 
  options: RequestInit = {},
  mockFallback?: () => Promise<T> | T
): Promise<T> => {
  const config = apiConfig.getConfig();
  
  // Mock-only mode
  if (isMockOnlyMode()) {
    if (!mockFallback) {
      throw new Error('Mock data not available');
    }
    console.log(`📱 Mock模式: ${endpoint}`);
    return await mockFallback();
  }
  
  // Real API mode
  if (config.mode === 'real') {
    console.log(`🌐 真實API: ${endpoint}`);
    return await apiCall(endpoint, options);
  }
  
  // Hybrid mode - try real API first, fallback to mock
  if (config.mode === 'hybrid') {
    try {
      console.log(`🔄 混合模式 (真實API): ${endpoint}`);
      return await apiCall(endpoint, options);
    } catch (error) {
      if (mockFallback) {
        console.log(`📱 混合模式 (回退Mock): ${endpoint}`, error);
        return await mockFallback();
      }
      throw error;
    }
  }
  
  throw new Error(`Unknown API mode: ${config.mode}`);
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  ME: '/auth/me',
  
  // Health
  HEALTH: '/system/health',
  
  // Projects
  PROJECTS: '/projects',
  PROJECT_DETAILS: (id: string) => `/projects/${id}`,
  
  // Tasks
  PROJECT_TASKS: (projectId: string) => `/projects/${projectId}/tasks`,
  TASK_DETAILS: (projectId: string, taskId: string) => `/projects/${projectId}/tasks/${taskId}`,
  TASK_ASSIGN: (projectId: string, taskId: string) => `/projects/${projectId}/tasks/${taskId}/assign`,
  TASK_STATUS: (projectId: string, taskId: string) => `/projects/${projectId}/tasks/${taskId}/status`,
  TASK_AUTO_ASSIGN: (projectId: string) => `/projects/${projectId}/tasks/auto-assign`,
  TASK_STATS: (projectId: string) => `/projects/${projectId}/tasks/stats`,
  
  // Files
  PROJECT_FILES: (projectId: string) => `/projects/${projectId}/files`,
  FILE_UPLOAD: (projectId: string) => `/projects/${projectId}/files/upload`,
  FILE_DETAILS: (projectId: string, fileId: string) => `/projects/${projectId}/files/${fileId}`,
  FILE_DOWNLOAD: (projectId: string, fileId: string) => `/projects/${projectId}/files/${fileId}/download`,
  
  // Annotations
  PROJECT_ANNOTATIONS: (projectId: string) => `/projects/${projectId}/annotations`
}; 