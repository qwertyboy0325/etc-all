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
  register: (email: string, password: string, fullName: string) => Promise<boolean>;
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
  const checkAuth = () => {
    setIsLoading(true);
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Clear invalid data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  // Removed mock token helper – always use real API

  // Login function (real API only)
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 嘗試登入:', email);
      const response = await fetch(`${apiConfig.getConfig().baseUrl}/auth/login`, {
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

      localStorage.setItem('token', data.access_token || data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.access_token || data.accessToken);
      setUser(data.user);
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(error.message || '登入失敗');
      return false;
    }
  };

  // Register function (real API only)
  const register = async (email: string, password: string, fullName: string): Promise<boolean> => {
    try {
      const response = await fetch(`${apiConfig.getConfig().baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName })
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
  
  return {
    isAdmin: user?.globalRole === 'admin',
    isSystemAdmin: user?.globalRole === 'system_admin',
    canCreateProjects: user?.globalRole === 'admin' || user?.globalRole === 'system_admin',
    canManageUsers: user?.globalRole === 'system_admin',
    canAccessSystem: user?.isActive ?? false,
  };
};

export default AuthContext; 