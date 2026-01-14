import React, { ReactNode } from 'react';
import { Layout, Typography, Breadcrumb, Space } from 'antd';
import Navbar from '../Navbar';

const { Content } = Layout;
const { Title } = Typography;

interface PageLayoutProps {
  children: ReactNode;
  title?: string | ReactNode;
  subtitle?: string;
  extra?: ReactNode; // Buttons/Actions
  breadcrumbs?: { title: string; href?: string; onClick?: () => void }[];
  noPadding?: boolean;
}

const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  title, 
  subtitle, 
  extra, 
  breadcrumbs, 
  noPadding = false 
}) => {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Navbar />
      
      <Content style={{ 
        padding: noPadding ? 0 : '24px', 
        maxWidth: '1600px',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header Section */}
        {(title || breadcrumbs) && (
          <div style={{ marginBottom: 24 }}>
            {breadcrumbs && (
              <Breadcrumb 
                items={breadcrumbs.map(b => ({ 
                  title: b.onClick ? <span style={{ cursor: 'pointer' }} onClick={b.onClick}>{b.title}</span> : b.title, 
                  href: b.href 
                }))} 
                style={{ marginBottom: 12 }} 
              />
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                {title && (
                  typeof title === 'string' ? (
                    <Title level={2} style={{ margin: 0, fontWeight: 600, color: '#262626' }}>{title}</Title>
                  ) : title
                )}
                {subtitle && (
                  <Typography.Text type="secondary" style={{ fontSize: 14, display: 'block', marginTop: 4 }}>
                    {subtitle}
                  </Typography.Text>
                )}
              </div>
              
              {extra && (
                <Space align="center">
                  {extra}
                </Space>
              )}
            </div>
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </Content>
    </Layout>
  );
};

export default PageLayout;








