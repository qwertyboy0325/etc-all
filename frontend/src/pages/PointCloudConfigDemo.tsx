import React, { useState, useRef } from 'react';
import { Layout, Row, Col, Card, Button, Space, Typography, message } from 'antd';
import { UploadOutlined, EyeOutlined, RotateLeftOutlined } from '@ant-design/icons';
import PointCloudRenderer, { PointCloudRendererRef } from '../components/PointCloudRenderer';
import PointCloudControls, { PointCloudConfig } from '../components/PointCloudControls';
import { parseNpyFile, calculateBounds } from '../utils/npyParser';
import { extractPointCloudFromNpzBuffer } from '../utils/npzParser';
import Navbar from '../components/Navbar';

const { Content } = Layout;
const { Title, Text } = Typography;

const PointCloudConfigDemo: React.FC = () => {
  const [pointCloudData, setPointCloudData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const rendererRef = useRef<PointCloudRendererRef>(null);

  // 默認配置
  const [config, setConfig] = useState<PointCloudConfig>({
    pointSize: 2,
    pointColor: '#00ff00',
    backgroundColor: '#000000',
    showAxes: true,
    showGrid: false,
    autoRotate: false,
    rotationSpeed: 1,
    opacity: 1,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    coordinateSystem: 'y-up',
    autoRotateNpz: true,
  });

  // 處理文件上傳
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.npy') && !file.name.endsWith('.npz')) {
      message.error('請選擇 .npy 或 .npz 文件');
      return;
    }

    try {
      setLoading(true);
      const arrayBuffer = await file.arrayBuffer();
      
      let pointCloudData;
      if (file.name.endsWith('.npz')) {
        pointCloudData = await extractPointCloudFromNpzBuffer(arrayBuffer);
      } else {
        const npyData = parseNpyFile(arrayBuffer);
        pointCloudData = {
          positions: npyData.data,
          pointCount: npyData.shape[0],
          bounds: calculateBounds(npyData.data)
        };
      }

      setPointCloudData(pointCloudData);
      message.success('點雲文件載入成功');
    } catch (error) {
      console.error('Failed to load file:', error);
      message.error('文件載入失敗');
    } finally {
      setLoading(false);
    }
  };

  // 生成示例點雲
  const generateSamplePointCloud = () => {
    const pointCount = 10000;
    const positions = new Float32Array(pointCount * 3);
    
    for (let i = 0; i < pointCount; i++) {
      // 生成一個球體點雲
      const radius = Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    const bounds = calculateBounds(positions);
    setPointCloudData({
      positions,
      pointCount,
      bounds
    });
    message.success('示例點雲生成成功');
  };

  // 重置配置
  const handleResetConfig = () => {
    setConfig({
      pointSize: 2,
      pointColor: '#00ff00',
      backgroundColor: '#000000',
      showAxes: true,
      showGrid: false,
      autoRotate: false,
      rotationSpeed: 1,
      opacity: 1,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      coordinateSystem: 'y-up',
      autoRotateNpz: true,
    });
    message.info('配置已重置');
  };

  // 適應視圖
  const handleFitToView = () => {
    rendererRef.current?.fitToView();
    message.info('視圖已適應');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navbar title="點雲配置演示" />
      <Content style={{ padding: '24px' }}>
        <Row gutter={24}>
          <Col span={18}>
            <Card 
              title="點雲渲染器" 
              style={{ height: '80vh' }}
              bodyStyle={{ padding: 0, height: '100%' }}
            >
              <div style={{ height: '100%', width: '100%' }}>
                {pointCloudData ? (
                  <PointCloudRenderer
                    ref={rendererRef}
                    data={pointCloudData}
                    config={config}
                    width={800}
                    height={600}
                  />
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%',
                    color: '#999'
                  }}>
                    <Text type="secondary" style={{ fontSize: '16px', marginBottom: '16px' }}>
                      請上傳點雲文件或生成示例點雲
                    </Text>
                    <Space>
                      <Button 
                        icon={<UploadOutlined />}
                        onClick={() => document.getElementById('file-input')?.click()}
                        loading={loading}
                      >
                        上傳文件
                      </Button>
                      <Button 
                        type="primary"
                        onClick={generateSamplePointCloud}
                      >
                        生成示例點雲
                      </Button>
                    </Space>
                    <input
                      id="file-input"
                      type="file"
                      accept=".npy,.npz"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </div>
            </Card>
          </Col>
          
          <Col span={6}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Card title="操作面板" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    icon={<UploadOutlined />}
                    onClick={() => document.getElementById('file-input')?.click()}
                    loading={loading}
                    block
                  >
                    上傳點雲文件
                  </Button>
                  <Button 
                    type="primary"
                    onClick={generateSamplePointCloud}
                    block
                  >
                    生成示例點雲
                  </Button>
                  <Button 
                    icon={<EyeOutlined />}
                    onClick={handleFitToView}
                    disabled={!pointCloudData}
                    block
                  >
                    適應視圖
                  </Button>
                  <Button 
                    icon={<RotateLeftOutlined />}
                    onClick={handleResetConfig}
                    block
                  >
                    重置配置
                  </Button>
                </Space>
              </Card>

              <PointCloudControls
                config={config}
                onConfigChange={setConfig}
                onReset={handleResetConfig}
                onFitToView={handleFitToView}
                disabled={!pointCloudData}
              />

              {pointCloudData && (
                <Card title="點雲信息" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>點數量：</Text>
                      <Text>{pointCloudData.pointCount.toLocaleString()}</Text>
                    </div>
                    <div>
                      <Text strong>邊界：</Text>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        <div>X: {pointCloudData.bounds.min[0].toFixed(2)} ~ {pointCloudData.bounds.max[0].toFixed(2)}</div>
                        <div>Y: {pointCloudData.bounds.min[1].toFixed(2)} ~ {pointCloudData.bounds.max[1].toFixed(2)}</div>
                        <div>Z: {pointCloudData.bounds.min[2].toFixed(2)} ~ {pointCloudData.bounds.max[2].toFixed(2)}</div>
                      </div>
                    </div>
                  </Space>
                </Card>
              )}
            </Space>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default PointCloudConfigDemo;
