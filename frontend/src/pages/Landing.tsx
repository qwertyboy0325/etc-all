import React from 'react';
import { Layout, Typography, Button, Space, Card } from 'antd';
import { Cloud, Database, Settings, Eye, FileText } from 'lucide-react';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

const Landing: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Cloud size={32} style={{ color: '#1890ff', marginRight: '12px' }} />
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            ETC 點雲標注系統
          </Title>
        </div>
        
        <div style={{ marginLeft: 'auto' }}>
          <Space>
            <Button type="text" href="/">
              首頁
            </Button>
            <Button type="text" href="/viewer">
              點雲查看器
            </Button>
            <Button type="text" href="/tasks">
              任務管理
            </Button>
          </Space>
        </div>
      </Header>

      <Content style={{ background: '#f5f5f5' }}>
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <Title level={1}>
              <Cloud size={48} style={{ color: '#1890ff', marginRight: '16px' }} />
              ETC 點雲標注系統
            </Title>
            <Paragraph style={{ fontSize: '18px', color: '#666' }}>
              專業的點雲數據標注平台，用於車種辨識AI模型訓練
            </Paragraph>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Database size={32} style={{ color: '#52c41a', marginBottom: '16px' }} />
                <Title level={4}>點雲數據管理</Title>
                <Paragraph>
                  支援 .npy/.npz 格式點雲文件上傳，提供高效的數據存儲和管理方案
                </Paragraph>
              </div>
            </Card>

            <Card>
              <div style={{ textAlign: 'center' }}>
                <Eye size={32} style={{ color: '#1890ff', marginBottom: '16px' }} />
                <Title level={4}>3D 點雲查看器</Title>
                <Paragraph>
                  先進的3D渲染引擎，支持點雲可視化、交互控制和多種顯示模式
                </Paragraph>
              </div>
            </Card>

            <Card>
              <div style={{ textAlign: 'center' }}>
                <FileText size={32} style={{ color: '#722ed1', marginBottom: '16px' }} />
                <Title level={4}>任務管理系統</Title>
                <Paragraph>
                  智能任務分配、進度追蹤，支援多用戶協作標注和工作流管理
                </Paragraph>
              </div>
            </Card>

            <Card>
              <div style={{ textAlign: 'center' }}>
                <Settings size={32} style={{ color: '#fa8c16', marginBottom: '16px' }} />
                <Title level={4}>審核工作流</Title>
                <Paragraph>
                  完整的審核流程管理，確保標注數據的準確性和一致性
                </Paragraph>
              </div>
            </Card>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Space size="large">
              <Button type="primary" size="large" href="/viewer">
                🎨 體驗點雲查看器
              </Button>
              <Button size="large" href="/tasks">
                📋 任務管理
              </Button>
              <Button size="large">
                📖 查看文檔
              </Button>
            </Space>
          </div>

          {/* Week 5 Development Status */}
          <Card style={{ marginTop: '40px', background: '#f6ffed' }}>
            <Title level={4} style={{ color: '#52c41a' }}>
              🎉 Week 5 開發進度 - 任務管理系統
            </Title>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <Text strong style={{ color: '#52c41a' }}>✅ 任務模型</Text>
                <div style={{ fontSize: '12px', color: '#666' }}>完整的任務數據模型</div>
              </div>
              <div>
                <Text strong style={{ color: '#52c41a' }}>✅ 任務服務</Text>
                <div style={{ fontSize: '12px', color: '#666' }}>CRUD、分配、狀態管理</div>
              </div>
              <div>
                <Text strong style={{ color: '#52c41a' }}>✅ 任務API</Text>
                <div style={{ fontSize: '12px', color: '#666' }}>完整的RESTful端點</div>
              </div>
              <div>
                <Text strong style={{ color: '#1890ff' }}>🚧 前端界面</Text>
                <div style={{ fontSize: '12px', color: '#666' }}>任務管理界面開發中</div>
              </div>
            </div>
          </Card>
        </div>
      </Content>

      <Footer style={{ textAlign: 'center', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
        ETC Point Cloud Annotation System ©2024 Created by ETC Team
        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
          🎯 Week 5: Task Management System - 開發進行中
        </div>
      </Footer>
    </Layout>
  );
};

export default Landing; 