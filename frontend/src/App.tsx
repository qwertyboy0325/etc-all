import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout, Typography, Button, Space, Card } from 'antd'
import { Cloud, Database, Users, Settings } from 'lucide-react'

const { Header, Content, Footer } = Layout
const { Title, Paragraph } = Typography

// Temporary landing page component
const LandingPage: React.FC = () => {
  return (
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
            <Users size={32} style={{ color: '#722ed1', marginBottom: '16px' }} />
            <Title level={4}>多人協作標注</Title>
            <Paragraph>
              支援多用戶同時標注，智能任務分配，提高標注效率和品質
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
          <Button type="primary" size="large">
            開始標注
          </Button>
          <Button size="large">
            查看文檔
          </Button>
        </Space>
      </div>
    </div>
  )
}

// Main App component
const App: React.FC = () => {
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
      </Header>

      <Content style={{ background: '#f5f5f5' }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {/* Add more routes here */}
        </Routes>
      </Content>

      <Footer style={{ textAlign: 'center', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
        ETC Point Cloud Annotation System ©2024 Created by ETC Team
      </Footer>
    </Layout>
  )
}

export default App 