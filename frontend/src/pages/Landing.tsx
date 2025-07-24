import React from 'react';
import { Layout, Card, Row, Col, Typography, Space, Button, Statistic } from 'antd';
import { 
  ProjectOutlined, 
  UserOutlined, 
  FileTextOutlined,
  SettingOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ApiModeSwitch from '../components/ApiModeSwitch';

const { Content } = Layout;
const { Title, Text } = Typography;

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const quickActions = [
    {
      title: '專案管理',
      description: '創建和管理點雲標注專案',
      icon: <ProjectOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
      action: () => navigate('/projects')
    },
    {
      title: '任務管理', 
      description: '查看和分配標注任務',
      icon: <FileTextOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
      action: () => navigate('/tasks')
    },
    {
      title: '點雲查看器',
      description: '查看和分析點雲數據',
      icon: <UserOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />,
      action: () => navigate('/viewer')
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '50px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <Title level={1} style={{ color: '#1890ff', marginBottom: '16px' }}>
              歡迎使用 ETC 點雲標注系統
            </Title>
            <Text style={{ fontSize: '16px', color: '#666' }}>
              高效的點雲車輛檢測標注平台，歡迎 {user?.fullName || user?.email}
            </Text>
          </div>

          {/* Quick Actions */}
          <Row gutter={[24, 24]} style={{ marginBottom: '50px' }}>
            {quickActions.map((action, index) => (
              <Col xs={24} sm={12} md={8} key={index}>
                <Card 
                  hoverable
                  style={{ height: '200px', cursor: 'pointer' }}
                  onClick={action.action}
                  bodyStyle={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}
                >
                  <Space direction="vertical" size="large">
                    {action.icon}
                    <div>
                      <Title level={4} style={{ margin: '8px 0' }}>
                        {action.title}
                      </Title>
                      <Text type="secondary">{action.description}</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>

          {/* System Status */}
          <Row gutter={[24, 24]} style={{ marginBottom: '30px' }}>
            <Col xs={24} md={16}>
              <Card title="📊 系統概覽" size="small">
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="活躍專案" value={3} suffix="個" />
                  </Col>
                  <Col span={8}>
                    <Statistic title="待處理任務" value={12} suffix="個" />
                  </Col>
                  <Col span={8}>
                    <Statistic title="本週完成" value={28} suffix="個" />
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <ApiModeSwitch showCard={true} />
            </Col>
          </Row>

          {/* Quick Links */}
          <Card title={
            <Space>
              <SettingOutlined />
              <span>快速導航</span>
            </Space>
          }>
            <Row gutter={16}>
              <Col span={6}>
                <Button 
                  type="link" 
                  block 
                  onClick={() => navigate('/projects')}
                >
                  專案列表
                </Button>
              </Col>
              <Col span={6}>
                <Button 
                  type="link" 
                  block 
                  onClick={() => navigate('/tasks')}
                >
                  我的任務
                </Button>
              </Col>
              <Col span={6}>
                <Button 
                  type="link" 
                  block 
                  onClick={() => navigate('/viewer')}
                >
                  點雲查看器
                </Button>
              </Col>
              <Col span={6}>
                <Button 
                  type="link" 
                  block 
                  onClick={() => window.open('http://localhost:8000/api/v1/docs', '_blank')}
                >
                  API文檔
                </Button>
              </Col>
            </Row>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default Landing; 