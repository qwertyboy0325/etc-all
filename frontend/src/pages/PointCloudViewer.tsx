import React, { useState, useEffect, useRef } from 'react';
import { Layout, Card, Select, Button, message, Upload, Space, Typography, Row, Col, Spin, Alert } from 'antd';
import { UploadOutlined, ReloadOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import Navbar from '../components/Navbar';
import { PointCloudRenderer, PointCloudData, PointCloudRendererRef } from '../components/PointCloudRenderer';
import PointCloudControls, { PointCloudConfig } from '../components/PointCloudControls';
import { getFileList, downloadFile, uploadFile, generateSampleFiles, formatFileSize, formatDate, validateFileFormat, FileInfo } from '../services/fileService';

const { Content } = Layout;
const { Text } = Typography;
const { Option } = Select;

const PointCloudViewer: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [pointCloudData, setPointCloudData] = useState<PointCloudData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [generatingSamples, setGeneratingSamples] = useState(false);
  const [uploading, setUploading] = useState(false);
  const rendererRef = useRef<PointCloudRendererRef>(null);

  // 點雲配置狀態
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

  // 載入文件列表
  const loadFilesList = async () => {
    try {
      setLoading(true);
      setError(undefined);
      console.log('Loading file list...');
      const fileList = await getFileList();
      console.log('File list loaded:', fileList);
      setFiles(fileList);
      
      if (fileList.length === 0) {
        message.info('沒有找到點雲文件，請先上傳或生成示例文件');
      } else {
        message.success(`成功載入 ${fileList.length} 個文件`);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
      const errorMessage = err instanceof Error ? err.message : '載入文件列表失敗';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 載入點雲文件
  const loadFileData = async (fileId: string) => {
    if (!fileId) return;

    setLoading(true);
    setError(undefined);

    try {
      const arrayBuffer = await downloadFile(fileId);
      const file = files.find(f => f.id === fileId);
      
      // 解析點雲數據
      let pointCloudData: PointCloudData;
      if (file?.original_filename?.endsWith('.npz')) {
        const { extractPointCloudFromNpzBuffer } = await import('../utils/npzParser');
        pointCloudData = await extractPointCloudFromNpzBuffer(arrayBuffer);
      } else {
        const { parseNpyFile, calculateBounds } = await import('../utils/npyParser');
        const npyData = parseNpyFile(arrayBuffer);
        pointCloudData = {
          positions: npyData.data,
          pointCount: npyData.shape[0],
          bounds: calculateBounds(npyData.data)
        };
      }
      
      setPointCloudData(pointCloudData);
      setSelectedFileId(fileId);
      message.success('點雲文件載入成功！');
    } catch (err) {
      console.error('Failed to load file:', err);
      setError('載入文件失敗');
      message.error('載入文件失敗');
    } finally {
      setLoading(false);
    }
  };

  // 處理配置變更
  const handleConfigChange = (newConfig: PointCloudConfig) => {
    setConfig(newConfig);
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

  // 生成示例文件
  const handleGenerateSamples = async () => {
    try {
      setGeneratingSamples(true);
      const result = await generateSampleFiles();
      message.success(`成功生成 ${result.files.length} 個示例文件`);
      await loadFilesList(); // 重新載入文件列表
    } catch (err) {
      console.error('Failed to generate samples:', err);
      message.error('生成示例文件失敗');
    } finally {
      setGeneratingSamples(false);
    }
  };

  // 處理文件上傳
  const handleFileUpload = async (file: File) => {
    if (!validateFileFormat(file.name)) {
      message.error('只支援 .npy 和 .npz 格式的文件');
      return false;
    }

    try {
      setUploading(true);
      await uploadFile(file);
      message.success('文件上傳成功！');
      await loadFilesList(); // 重新載入文件列表
    } catch (err) {
      console.error('Upload failed:', err);
      message.error('文件上傳失敗');
    } finally {
      setUploading(false);
    }

    return false; // 阻止自動上傳
  };

  // 處理文件選擇
  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
    loadFileData(fileId);
  };

  // 初始化載入
  useEffect(() => {
    loadFilesList();
  }, []);

  // 渲染器載入完成回調
  const handleRendererLoad = () => {
    setLoading(false);
  };

  // 渲染器錯誤回調
  const handleRendererError = (error: string) => {
    setError(error);
    setLoading(false);
    message.error(error);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navbar />
      <Content style={{ padding: '24px', background: '#f5f7fa', overflow: 'auto' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <Row gutter={[24, 24]}>
          {/* 左側控制面板 */}
          <Col xs={24} lg={6}>
            <Card title="文件管理" extra={
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadFilesList}
                  loading={loading}
                >
                  刷新
                </Button>
                <Button 
                  type="primary" 
                  icon={<EyeOutlined />}
                  onClick={handleGenerateSamples}
                  loading={generatingSamples}
                >
                  生成示例
                </Button>
              </Space>
            }>
              {/* 文件上傳 */}
              <Upload
                beforeUpload={handleFileUpload}
                showUploadList={false}
                accept=".npy,.npz"
              >
                <Button 
                  icon={<UploadOutlined />} 
                  loading={uploading}
                  style={{ width: '100%', marginBottom: 16 }}
                >
                  上傳點雲文件
                </Button>
              </Upload>

              {/* 文件列表 */}
              <div style={{ marginTop: 16 }}>
                <Text strong>可用文件 ({files.length})</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="選擇點雲文件"
                  value={selectedFileId}
                  onChange={handleFileSelect}
                  loading={loading}
                  dropdownStyle={{ zIndex: 2000 }}
                  getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                  popupMatchSelectWidth={false}
                  notFoundContent={
                    <div style={{ padding: '16px', textAlign: 'center' }}>
                      <Text type="secondary">沒有找到文件</Text>
                    </div>
                  }
                >
                  {files.map(file => (
                    <Option key={file.id} value={file.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{file.original_filename}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                          </div>
                        </div>
                        <DownloadOutlined />
                      </div>
                    </Option>
                  ))}
                </Select>
              </div>

              {/* 錯誤提示 */}
              {error && (
                <Alert
                  message="錯誤"
                  description={error}
                  type="error"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}

              {/* 載入狀態 */}
              {loading && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">載入中...</Text>
                  </div>
                </div>
              )}
            </Card>
          </Col>

          {/* 右側3D視圖 */}
          <Col xs={24} lg={18}>
            <Card 
              title="3D 點雲查看器" 
              style={{ height: '60vh', minHeight: 420 }}
              styles={{ body: { padding: 0, height: '100%' } }}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <PointCloudRenderer
                  ref={rendererRef}
                  data={pointCloudData}
                  config={config}
                  onLoad={handleRendererLoad}
                  onError={handleRendererError}
                />
                
                {/* 載入遮罩 */}
                {loading && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                  }}>
                    <div style={{ textAlign: 'center', color: 'white' }}>
                      <Spin size="large" />
                      <div style={{ marginTop: 16 }}>
                        <Text style={{ color: 'white' }}>載入點雲中...</Text>
                      </div>
                    </div>
                  </div>
                )}

                {/* 空狀態 */}
                {!selectedFileId && !loading && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f0f0f0'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <EyeOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: 16 }} />
                      <div>
                        <Text type="secondary">請選擇一個點雲文件開始查看</Text>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* 點雲配置區域 */}
        <Row gutter={[24, 24]} style={{ marginTop: 16 }}>
          <Col xs={24}>
            <PointCloudControls
              config={config}
              onConfigChange={handleConfigChange}
              onReset={handleResetConfig}
              onFitToView={handleFitToView}
              disabled={!pointCloudData}
            />
          </Col>
        </Row>
        </div>
      </Content>
    </Layout>
  );
};

export default PointCloudViewer; 