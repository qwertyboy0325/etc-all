import React from 'react';
import { Layout, Space, Button, Dropdown, Avatar, Typography, Tag } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  CrownOutlined,
  ToolOutlined,
  DownOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, usePermissions } from '../contexts/AuthContext';
import ApiModeSwitch from './ApiModeSwitch';
import type { MenuProps } from 'antd';

const { Header } = Layout;
const { Text } = Typography;

interface NavbarProps {
  title?: string;
}

const Navbar: React.FC<NavbarProps> = ({ title = 'ETC 點雲標注系統' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { isAdmin, isSystemAdmin } = usePermissions();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '個人資料',
      onClick: () => {
        // TODO: Navigate to profile page
        console.log('Navigate to profile');
      }
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '設置',
      onClick: () => {
        // TODO: Navigate to settings page
        console.log('Navigate to settings');
      }
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      onClick: handleLogout
    }
  ];

  const getRoleIcon = () => {
    if (isSystemAdmin) return <CrownOutlined style={{ color: '#722ed1' }} />;
    if (isAdmin) return <ToolOutlined style={{ color: '#fa8c16' }} />;
    return <UserOutlined style={{ color: '#1890ff' }} />;
  };

  const getRoleText = () => {
    if (isSystemAdmin) return '系統管理員';
    if (isAdmin) return '管理員';
    return '用戶';
  };

  const getRoleColor = () => {
    if (isSystemAdmin) return 'purple';
    if (isAdmin) return 'orange';
    return 'blue';
  };

  // Don't render navbar on login page
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <Header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      background: '#fff',
      borderBottom: '1px solid #f0f0f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: '0 24px'
    }}>
      {/* Left: Logo and Title */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <div 
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <Space>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #1890ff, #722ed1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              ETC
            </div>
            <Text strong style={{ fontSize: '18px', color: '#262626' }}>
              {title}
            </Text>
          </Space>
        </div>
      </div>

      {/* Right: User Info and Actions */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {isAuthenticated && user ? (
          <Space size="large">
            {/* Navigation Links */}
            <Space>
              <Button 
                type="text" 
                onClick={() => navigate('/')}
                style={{ 
                  color: location.pathname === '/' ? '#1890ff' : undefined 
                }}
              >
                首頁
              </Button>
              <Button 
                type="text" 
                onClick={() => navigate('/viewer')}
                style={{ 
                  color: location.pathname === '/viewer' ? '#1890ff' : undefined 
                }}
              >
                點雲查看器
              </Button>
              <Button 
                type="text" 
                onClick={() => navigate('/projects')}
                style={{ 
                  color: location.pathname === '/projects' ? '#1890ff' : undefined 
                }}
              >
                專案管理
              </Button>
              <Button 
                type="text" 
                onClick={() => navigate('/tasks')}
                style={{ 
                  color: location.pathname.includes('/tasks') ? '#1890ff' : undefined 
                }}
              >
                任務管理
              </Button>
            </Space>

            {/* User Info */}
            <Space style={{ marginLeft: 'auto' }}>
              {/* Debug: 顯示當前用戶資訊 */}
              <Text type="secondary" style={{ fontSize: '12px' }}>
                用戶: {user?.email} | 權限: {user?.globalRole} | Token: {localStorage.getItem('token')?.substring(0, 20)}...
              </Text>
              
              {/* Debug: Quick Admin Login Button */}
              {user?.globalRole !== 'admin' && (
                <Button 
                  size="small" 
                  type="dashed" 
                  onClick={async () => {
                    logout();
                    // 短暫延遲後跳轉到登入頁面並自動填入admin帳號
                    setTimeout(() => {
                      navigate('/login?email=admin@etc.com&password=admin');
                    }, 100);
                  }}
                  style={{ fontSize: '10px', height: '24px' }}
                >
                  切換Admin
                </Button>
              )}
              
              {/* API Mode Switch */}
              <ApiModeSwitch compact={true} />
              
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'profile',
                      label: '個人資料',
                      icon: <UserOutlined />,
                      onClick: () => navigate('/profile')
                    },
                    {
                      key: 'settings',
                      label: '系統設定',
                      icon: <SettingOutlined />,
                      onClick: () => navigate('/settings')
                    },
                    {
                      type: 'divider'
                    },
                    {
                      key: 'logout',
                      label: '登出',
                      icon: <LogoutOutlined />,
                      danger: true,
                      onClick: logout
                    }
                  ]
                }}
                trigger={['click']}
              >
                <Button type="text" style={{ height: '40px', padding: '0 12px' }}>
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    <Text style={{ color: '#fff' }}>{user?.fullName || user?.email}</Text>
                    <DownOutlined style={{ color: '#fff', fontSize: '10px' }} />
                  </Space>
                </Button>
              </Dropdown>
            </Space>
          </Space>
        ) : (
          <Button 
            type="primary" 
            icon={<UserOutlined />}
            onClick={() => navigate('/login')}
          >
            登入
          </Button>
        )}
      </div>
    </Header>
  );
};

export default Navbar; 