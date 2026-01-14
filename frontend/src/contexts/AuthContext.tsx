import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import { apiConfig } from '../config/api';

// Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  globalRole: 'admin' | 'user' | 'system_admin';
  isActive?: boolean;
  createdAt?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, confirmPassword: string, fullName: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  checkAuth: () => void;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Check if user is authenticated
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      // 若無任何憑證，確保狀態為未登入
      if (!storedToken || !storedUser) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        return;
      }

      // 先套用暫存以避免閃爍，但立即向後端驗證
      setToken(storedToken);
      setUser(normalizeUser(JSON.parse(storedUser)));

      // 向後端驗證 token，失敗則清除並標記為未登入
      const baseUrl = apiConfig.getConfig().baseUrl;
      const resp = await fetch(`${baseUrl}/auth/verify-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });

      if (!resp.ok) {
        throw new Error('Token invalid');
      }

      // 可選：同步最新使用者資料
      // const me = await fetch(`${baseUrl}/auth/me`, { headers: { 'Authorization': `Bearer ${storedToken}` }});
      // if (me.ok) setUser(normalizeUser(await me.json()));

    } catch (error) {
      console.warn('Auth verification failed, clearing credentials');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Normalize backend user payload to frontend shape
  const normalizeUser = (raw: any): User => {
    if (!raw) return raw;
    return {
      id: raw.id,
      email: raw.email,
      fullName: raw.fullName || raw.full_name || raw.username || raw.email,
      globalRole: (raw.globalRole || raw.global_role || '').toString().toLowerCase() as any,
      isActive: raw.isActive ?? raw.is_active,
      createdAt: raw.createdAt || raw.created_at
    } as User;
  };

  // Removed mock token helper – always use real API

  // Login function (real API only)
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 嘗試登入:', email);
      const baseUrl = apiConfig.getConfig().baseUrl;
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('📡 API響應狀態:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API錯誤: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ 真實API登入成功:', data);

      const mappedUser = normalizeUser(data.user);
      localStorage.setItem('token', data.access_token || data.accessToken);
      localStorage.setItem('user', JSON.stringify(mappedUser));
      setToken(data.access_token || data.accessToken);
      setUser(mappedUser);
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(error.message || '登入失敗');
      return false;
    }
  };

  // Register function (real API only)
  const register = async (email: string, password: string, confirmPassword: string, fullName: string): Promise<boolean> => {
    try {
      const baseUrl = apiConfig.getConfig().baseUrl;
      const response = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          confirm_password: confirmPassword, 
          full_name: fullName 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API錯誤: ${response.status}`);
      }

      // 註冊成功後請用戶登入
      message.success('註冊成功，請使用帳號登入');
      return true;
    } catch (error: any) {
      console.error('Register error:', error);
      message.error(error.message || '註冊失敗');
      return false;
    }
  };

  // Logout function
  const logout = () => {
    // Clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear state
    setToken(null);
    setUser(null);
    
    message.success('已成功登出');
  };

  // Update user information
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  // Computed values
  const isAuthenticated = !!(user && token);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper hooks
export const useUser = () => {
  const { user } = useAuth();
  return user;
};

export const usePermissions = () => {
  const { user } = useAuth();
  const role = (user?.globalRole || '').toString();
  const roleLower = role.toLowerCase();

  const isAdmin = roleLower === 'admin' || role === 'ADMIN';
  const isSystemAdmin = roleLower === 'system_admin' || role === 'SYSTEM_ADMIN';

  return {
    isAdmin,
    isSystemAdmin,
    canCreateProjects: isSystemAdmin, // Only System Admin can create projects
    canManageProjects: isAdmin || isSystemAdmin, // Admins can manage (edit, settings)
    canManageUsers: isSystemAdmin,
    canAccessSystem: user?.isActive ?? false,
  };
};

export default AuthContext; 