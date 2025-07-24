import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout, Typography, Button, Space, Card } from 'antd'
import { Cloud, Database, Users, Settings, Eye } from 'lucide-react'
import PointCloudViewerPage from './pages/PointCloudViewer'

const { Header, Content, Footer } = Layout
const { Title, Paragraph, Text } = Typography

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
            <Eye size={32} style={{ color: '#1890ff', marginBottom: '16px' }} />
            <Title level={4}>3D 點雲查看器</Title>
            <Paragraph>
              先進的3D渲染引擎，支持點雲可視化、交互控制和多種顯示模式
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
          <Button type="primary" size="large" href="/viewer">
            🎨 體驗點雲查看器
          </Button>
          <Button size="large">
            📖 查看文檔
          </Button>
          <Button size="large">
            🚀 開始標注
          </Button>
        </Space>
      </div>

      {/* Week 4 Development Status */}
      <Card style={{ marginTop: '40px', background: '#f6ffed' }}>
        <Title level={4} style={{ color: '#52c41a' }}>
          🎉 Week 4 開發進度
        </Title>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <Text strong style={{ color: '#52c41a' }}>✅ Three.js 整合</Text>
            <div style={{ fontSize: '12px', color: '#666' }}>react-three-fiber 成功集成</div>
          </div>
          <div>
            <Text strong style={{ color: '#52c41a' }}>✅ 3D 點雲渲染</Text>
            <div style={{ fontSize: '12px', color: '#666' }}>支持大量點雲數據顯示</div>
          </div>
          <div>
            <Text strong style={{ color: '#52c41a' }}>✅ 交互控制</Text>
            <div style={{ fontSize: '12px', color: '#666' }}>旋轉、縮放、平移操作</div>
          </div>
          <div>
            <Text strong style={{ color: '#52c41a' }}>✅ 文件上傳</Text>
            <div style={{ fontSize: '12px', color: '#666' }}>前端整合文件管理</div>
          </div>
        </div>
      </Card>
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
        
        <div style={{ marginLeft: 'auto' }}>
          <Space>
            <Button type="text" href="/">
              首頁
            </Button>
            <Button type="text" href="/viewer">
              點雲查看器
            </Button>
          </Space>
        </div>
      </Header>

      <Content style={{ background: '#f5f5f5' }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/viewer" element={<PointCloudViewerPage />} />
          {/* Add more routes here */}
        </Routes>
      </Content>

      <Footer style={{ textAlign: 'center', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
        ETC Point Cloud Annotation System ©2024 Created by ETC Team
        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
          🎯 Week 4: Point Cloud Rendering - 功能開發完成
        </div>
      </Footer>
    </Layout>
  )
}

export default App 