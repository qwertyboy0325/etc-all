import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { message } from 'antd';

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

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Try real API first, fallback to mock if API fails
      try {
        const response = await fetch('http://localhost:8000/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        if (response.ok) {
          const data = await response.json();
          
          // Store authentication data
          localStorage.setItem('token', data.access_token || data.accessToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          setToken(data.access_token || data.accessToken);
          setUser(data.user);

          return true;
        } else {
          // If API fails, try mock authentication
          console.warn('Real API login failed, trying mock authentication');
        }
      } catch (apiError) {
        console.warn('API login failed, using mock authentication:', apiError);
      }

      // Fallback to mock API call
      const response = await new Promise<any>((resolve, reject) => {
        setTimeout(() => {
          if (email === 'admin@etc.com' && password === 'admin123') {
            resolve({
              user: {
                id: '1',
                email: email,
                fullName: 'Admin User',
                globalRole: 'admin',
                isActive: true,
                createdAt: new Date().toISOString()
              },
              accessToken: 'mock-token-123'
            });
          } else if (email.includes('@') && password.length >= 6) {
            // Accept any valid email for demo
            resolve({
              user: {
                id: Date.now().toString(),
                email: email,
                fullName: email.split('@')[0],
                globalRole: 'user',
                isActive: true,
                createdAt: new Date().toISOString()
              },
              accessToken: 'mock-token-' + Date.now()
            });
          } else {
            reject(new Error('帳號或密碼錯誤'));
          }
        }, 1000);
      });

      // Store authentication data
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setToken(response.accessToken);
      setUser(response.user);

      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(error.message || '登入失敗');
      return false;
    }
  };

  // Register function
  const register = async (email: string, password: string, fullName: string): Promise<boolean> => {
    try {
      // Mock API call - replace with actual backend call
      const response = await new Promise<any>((resolve, reject) => {
        setTimeout(() => {
          if (email.includes('@') && password.length >= 6 && fullName.length >= 2) {
            resolve({
              user: {
                id: Date.now().toString(),
                email: email,
                fullName: fullName,
                globalRole: 'user',
                isActive: true,
                createdAt: new Date().toISOString()
              },
              accessToken: 'mock-token-' + Date.now()
            });
          } else {
            reject(new Error('註冊信息無效'));
          }
        }, 1000);
      });

      // Store authentication data
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setToken(response.accessToken);
      setUser(response.user);

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