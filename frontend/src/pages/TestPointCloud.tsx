import React, { useState, useRef } from 'react';
import { Button, Card, Layout, message, Space, Typography } from 'antd';
import { PointCloudRenderer, PointCloudRendererRef } from '../components/PointCloudRenderer';
import { downloadFile } from '../services/fileService';

const { Content } = Layout;
const { Title, Text } = Typography;

const TestPointCloud: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const rendererRef = useRef<PointCloudRendererRef>(null);

  const testLoadFile = async () => {
    try {
      setLoading(true);
      setError(undefined);

      // 測試載入一個示例文件
      const arrayBuffer = await downloadFile('sphere_sample');
      
      if (rendererRef.current?.loadFromArrayBuffer) {
        await rendererRef.current.loadFromArrayBuffer(arrayBuffer);
        message.success('測試文件載入成功！');
      } else {
        throw new Error('Renderer not ready');
      }
    } catch (err) {
      console.error('Test failed:', err);
      setError(err instanceof Error ? err.message : '測試失敗');
      message.error('測試失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Card title="點雲功能測試">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={4}>測試說明</Title>
              <Text>
                這個頁面用於測試點雲渲染功能。點擊下面的按鈕來載入測試文件。
              </Text>
            </div>

            <div>
              <Button 
                type="primary" 
                onClick={testLoadFile}
                loading={loading}
              >
                載入測試文件 (sphere_sample.npy)
              </Button>
            </div>

            {error && (
              <div style={{ color: 'red' }}>
                <Text strong>錯誤: </Text>
                <Text>{error}</Text>
              </div>
            )}

            <div style={{ height: '400px', border: '1px solid #d9d9d9' }}>
              <PointCloudRenderer
                ref={rendererRef}
                data={null}
                width={600}
                height={400}
                backgroundColor="#000000"
                pointSize={2}
                pointColor="#ffffff"
                onLoad={() => message.success('渲染器準備就緒')}
                onError={(error) => {
                  setError(error);
                  message.error(error);
                }}
              />
            </div>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
};

export default TestPointCloud; 