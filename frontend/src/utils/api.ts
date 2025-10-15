// API configuration and utilities
import { apiConfig } from '../config/api';

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
  
  // Always use real API
  
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

// smartApiCall removed; always use apiCall

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