import React, { useState, useEffect } from 'react'
import { Layout, Typography, Card, Button, Select, Space, message, Upload, Progress } from 'antd'
import { Upload as UploadIcon, Eye, FileText, RefreshCcw } from 'lucide-react'
import PointCloudViewer from '../components/PointCloudViewer'
import Navbar from '../components/Navbar'
import { 
  PointCloudData, 
  PointCloudFileInfo, 
  generateSamplePointCloud
} from '../utils/pointCloudLoader'

const { Title, Text } = Typography
const { Content } = Layout
const { Option } = Select

// Mock auth token and project ID for demo (unused in current demo mode)
// const MOCK_AUTH_TOKEN = 'demo-token'
// const MOCK_PROJECT_ID = 'demo-project'

const PointCloudViewerPage: React.FC = () => {
  const [pointCloudData, setPointCloudData] = useState<PointCloudData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [files, setFiles] = useState<PointCloudFileInfo[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  // Load files list on component mount
  useEffect(() => {
    loadFilesList()
  }, [])

  const loadFilesList = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/files', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.items || data || []);
      } else {
        console.error('Failed to load files');
        setFiles([]);
      }
    } catch (err) {
      console.error('Failed to load files:', err)
      message.error('載入文件列表失敗')
      setFiles([]);
    }
  }

  const loadSampleData = () => {
    setLoading(true)
    setError(undefined)
    
    try {
      // Generate sample point cloud for demo
      const sampleData = generateSamplePointCloud(15000)
      setPointCloudData(sampleData)
      message.success('示例點雲載入成功！')
    } catch (err) {
      setError('載入示例數據失敗')
      message.error('載入示例數據失敗')
    } finally {
      setLoading(false)
    }
  }

  const loadFileData = async (fileId: string) => {
    if (!fileId) return
    
    setLoading(true)
    setError(undefined)
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const pointCloudData = new Float32Array(arrayBuffer);
        
        // Convert to PointCloudData format
        const data: PointCloudData = {
          positions: pointCloudData,
          pointCount: pointCloudData.length / 3,
          bounds: {
            min: [-50, -50, -50],
            max: [50, 50, 50]
          }
        };
        
        setPointCloudData(data);
        setSelectedFileId(fileId);
        message.success('點雲文件載入成功！');
      } else {
        throw new Error('Failed to load file');
      }
    } catch (err) {
      setError('載入文件失敗')
      message.error('載入文件失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('http://localhost:8000/api/v1/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (response.ok) {
        const uploadedFile = await response.json()
        setFiles(prev => [...prev, uploadedFile])
        message.success('文件上傳成功！')
        setUploadProgress(100)
      } else {
        throw new Error('Upload failed')
      }
    } catch (err) {
      console.error('Upload error:', err)
      message.error('文件上傳失敗')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const clearData = () => {
    setPointCloudData(null)
    setSelectedFileId(null)
    setError(undefined)
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <Content style={{ padding: '24px', paddingTop: '88px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <Title level={2}>
              <Eye size={32} style={{ marginRight: '12px', color: '#1890ff' }} />
              點雲查看器
            </Title>
            <Text type="secondary">
              上傳並查看3D點雲數據，支持旋轉、縮放、平移等交互操作
            </Text>
          </div>

          {/* Controls Panel */}
          <Card style={{ marginBottom: '24px' }}>
            <Space wrap size="large">
              {/* File Selection */}
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  選擇文件：
                </Text>
                <Select
                  style={{ width: 300 }}
                  placeholder="選擇要查看的點雲文件"
                  value={selectedFileId}
                  onChange={loadFileData}
                  loading={loading}
                >
                  {files.map(file => (
                    <Option key={file.id} value={file.id}>
                      <Space>
                        <FileText size={16} />
                        {file.original_filename}
                        <Text type="secondary">
                          ({file.point_count?.toLocaleString()} 點)
                        </Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </div>

              {/* File Upload */}
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  上傳文件：
                </Text>
                <Upload
                  accept=".npy,.npz,.ply,.pcd"
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  disabled={isUploading}
                >
                  <Button 
                    icon={<UploadIcon size={16} />}
                    loading={isUploading}
                  >
                    {isUploading ? '上傳中...' : '上傳點雲文件'}
                  </Button>
                </Upload>
                {isUploading && (
                  <Progress 
                    percent={Math.round(uploadProgress)} 
                    style={{ marginTop: '8px', width: '200px' }}
                    size="small"
                  />
                )}
              </div>

              {/* Quick Actions */}
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  快速操作：
                </Text>
                <Space>
                  <Button
                    type="primary"
                    onClick={loadSampleData}
                    loading={loading}
                  >
                    載入示例數據
                  </Button>
                  <Button
                    icon={<RefreshCcw size={16} />}
                    onClick={loadFilesList}
                  >
                    刷新列表
                  </Button>
                  <Button
                    onClick={clearData}
                    disabled={!pointCloudData}
                  >
                    清除數據
                  </Button>
                </Space>
              </div>
            </Space>
          </Card>

          {/* Files List */}
          {files.length > 0 && (
            <Card title="項目文件" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {files.map(file => (
                  <Card 
                    key={file.id}
                    size="small"
                    style={{ 
                      cursor: 'pointer',
                      border: selectedFileId === file.id ? '2px solid #1890ff' : '1px solid #d9d9d9'
                    }}
                    onClick={() => loadFileData(file.id)}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Text strong>{file.original_filename}</Text>
                      <Text type="secondary">
                        📊 {file.point_count?.toLocaleString() || 'N/A'} 點
                      </Text>
                      <Text type="secondary">
                        📁 {(file.file_size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                      <Text type="secondary">
                        📅 {new Date(file.created_at).toLocaleDateString()}
                      </Text>
                    </Space>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* Point Cloud Viewer */}
          <PointCloudViewer
            data={pointCloudData}
            loading={loading}
            error={error}
            title={selectedFileId ? 
              `查看文件: ${files.find(f => f.id === selectedFileId)?.original_filename}` : 
              "點雲查看器"
            }
          />

          {/* Instructions */}
          <Card style={{ marginTop: '24px' }}>
            <Title level={4}>使用說明</Title>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <Text strong>📁 文件上傳</Text>
                <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                  <li>支持 .npy, .npz, .ply, .pcd 格式</li>
                  <li>文件大小限制: 50MB</li>
                  <li>自動分析點雲元數據</li>
                </ul>
              </div>
              <div>
                <Text strong>🎮 3D 控制</Text>
                <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                  <li>左鍵拖拽: 旋轉視角</li>
                  <li>滾輪: 縮放視角</li>
                  <li>右鍵拖拽: 平移視角</li>
                </ul>
              </div>
              <div>
                <Text strong>⚙️ 顯示設置</Text>
                <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                  <li>調整點大小</li>
                  <li>顯示/隱藏顏色</li>
                  <li>顯示/隱藏網格</li>
                  <li>性能統計</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  )
}

export default PointCloudViewerPage 