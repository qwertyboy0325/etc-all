import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import PointCloudViewerPage from './pages/PointCloudViewer';
import TaskManagement from './pages/TaskManagement';
import AnnotationPage from './pages/AnnotationPage';
import ProjectManagement from './pages/ProjectManagement';
import './App.css';

// Global error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '50px', 
          textAlign: 'center',
          color: '#ff4d4f' 
        }}>
          <h2>⚠️ 發生錯誤</h2>
          <p>應用程序遇到了錯誤，請重新載入頁面。</p>
          <button onClick={() => window.location.reload()}>
            重新載入
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
          },
        }}
      >
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Landing />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/viewer" 
              element={
                <ProtectedRoute>
                  <PointCloudViewerPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/:projectId/tasks" 
              element={
                <ProtectedRoute>
                  <TaskManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/:projectId/tasks/:taskId/annotate" 
              element={
                <ProtectedRoute>
                  <AnnotationPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tasks" 
              element={
                <ProtectedRoute>
                  <TaskManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects" 
              element={
                <ProtectedRoute>
                  <ProjectManagement />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch all - redirect to login */}
            <Route 
              path="*" 
              element={
                <ProtectedRoute>
                  <Landing />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </AuthProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App; 