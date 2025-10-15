import React, { useState } from 'react';
import { Button, Card, Layout, message, Space, Typography, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { parseNpyFile, calculateBounds } from '../utils/npyParser';

const { Content } = Layout;
const { Title, Text } = Typography;

const TestNpyParser: React.FC = () => {
  const [parsedData, setParsedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      
      // 讀取文件
      const arrayBuffer = await file.arrayBuffer();
      
      // 解析NPY文件
      const result = parseNpyFile(arrayBuffer);
      
      // 計算邊界
      const bounds = calculateBounds(result.data);
      
      setParsedData({
        ...result,
        bounds,
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      });
      
      message.success('NPY文件解析成功！');
    } catch (error) {
      console.error('Parse error:', error);
      message.error(`解析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
    
    // 返回false阻止自動上傳
    return false;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Card title="NPY解析器測試">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={4}>測試說明</Title>
              <Text>
                上傳一個NPY文件來測試解析器功能。
              </Text>
            </div>

            <Upload
              beforeUpload={handleFileUpload}
              showUploadList={false}
              accept=".npy"
              customRequest={() => {}} // 防止自動上傳
            >
              <Button 
                icon={<UploadOutlined />} 
                loading={loading}
                type="primary"
              >
                上傳NPY文件
              </Button>
            </Upload>

            {parsedData && (
              <Card title="解析結果" size="small">
                <Space direction="vertical" size="small">
                  <div>
                    <Text strong>文件信息:</Text>
                    <br />
                    <Text>名稱: {parsedData.fileInfo.name}</Text>
                    <br />
                    <Text>大小: {parsedData.fileInfo.size} bytes</Text>
                  </div>
                  
                  <div>
                    <Text strong>數據信息:</Text>
                    <br />
                    <Text>形狀: {parsedData.shape.join(' x ')}</Text>
                    <br />
                    <Text>數據類型: {parsedData.header.dtype}</Text>
                    <br />
                    <Text>總點數: {parsedData.data.length / 3}</Text>
                  </div>
                  
                  <div>
                    <Text strong>邊界信息:</Text>
                    <br />
                    <Text>最小值: [{parsedData.bounds.min.join(', ')}]</Text>
                    <br />
                    <Text>最大值: [{parsedData.bounds.max.join(', ')}]</Text>
                    <br />
                    <Text>中心點: [{parsedData.bounds.center.join(', ')}]</Text>
                    <br />
                    <Text>尺寸: [{parsedData.bounds.size.join(', ')}]</Text>
                  </div>
                  
                  <div>
                    <Text strong>前10個點:</Text>
                    <br />
                    <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px' }}>
                      {Array.from(parsedData.data.slice(0, 30)).map((val: any, i: number) => 
                        i % 3 === 0 ? `\n點${Math.floor(i/3)}: [${val.toFixed(3)}, ` : 
                        i % 3 === 1 ? `${val.toFixed(3)}, ` : 
                        `${val.toFixed(3)}]`
                      ).join('')}
                    </pre>
                  </div>
                </Space>
              </Card>
            )}
          </Space>
        </Card>
      </Content>
    </Layout>
  );
};

export default TestNpyParser; 