import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Landing from './pages/Landing';
import PointCloudViewerPage from './pages/PointCloudViewer';
import TaskManagement from './pages/TaskManagement';
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
      <ConfigProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/viewer" element={<PointCloudViewerPage />} />
            <Route path="/projects/:projectId/tasks" element={<TaskManagement />} />
            <Route path="/tasks" element={<TaskManagement />} />
          </Routes>
        </Router>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App; 