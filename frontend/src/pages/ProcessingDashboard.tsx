import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Rate,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  Badge,
  Divider,
  Spin,
  App,
  Checkbox,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExclamationCircleOutlined,
  EyeInvisibleOutlined,
  RocketOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageLayout from '../components/common/PageLayout';
import { apiCall } from '../utils/api';
import PointCloudRenderer, { PointCloudRendererRef } from '../components/PointCloudRenderer';
import { parseNpyFile, calculateBounds } from '../utils/npyParser';
import { extractPointCloudFromNpzBuffer } from '../utils/npzParser';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Annotation {
  id: string;
  task_id: string;
  task_name: string;
  annotator_id: string;
  annotator_name: string;
  vehicle_type_name: string;
  confidence: number;
  status: string;
  created_at: string;
  submitted_at: string;
  annotation_data: any;
}

interface Review {
  id: string;
  annotation_id: string;
  reviewer_id: string;
  reviewer_name: string;
  status: string;
  feedback: string;
  quality_score: number;
  reviewed_at: string;
  created_at: string;
}

interface ReviewFormData {
  status: string;
  feedback: string;
  quality_score: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  is_processing?: boolean;
  processing_status?: string;
  processing_error?: string;
}

const ProcessingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewForm] = Form.useForm();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const rendererRef = useRef<PointCloudRendererRef>(null);
  const [stats, setStats] = useState({
    total_annotations: 0,
    pending_reviews: 0,
    submitted_count: 0,
    average_quality: 0,
  });

  // Processing Execution State
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [processingLoading, setProcessingLoading] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoTrain, setAutoTrain] = useState(false);

  // 載入待處理標注 (Mapped from pending_review)
  const loadPendingAnnotations = async () => {
    try {
      setLoading(true);
      // Backend maps 'pending_review' to SUBMITTED status
      const response = await apiCall('/annotations/?status=pending_review', {
        method: 'GET',
      });
      setAnnotations(response.items || []);
    } catch (error) {
      console.error('Failed to load pending annotations:', error);
      message.error('載入待處理標注失敗');
    } finally {
      setLoading(false);
    }
  };

  // 載入統計
  const loadReviewStats = async () => {
    try {
      const response = await apiCall('/reviews/stats', {
        method: 'GET',
      });
      setStats(response || stats);
    } catch (error) {
      console.error('Failed to load review stats:', error);
    }
  };

  // Load projects for processing modal
  const loadProjects = async () => {
    try {
      const response = await apiCall('/projects/', { method: 'GET' });
      setProjects(response.items || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      message.error('載入專案列表失敗');
    }
  };

  // Poll project status
  const checkProjectStatus = async (projectId: string) => {
    try {
        const response = await apiCall(`/projects/${projectId}`, { method: 'GET' });
        const project = response;
        
        // Update project status in modal list if open
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...project } : p));

        if (project.is_processing) {
            // Still processing
            return true;
        } else {
            // Finished
            if (project.processing_status === 'completed') {
                message.success('處理已完成！');
                loadPendingAnnotations(); // Refresh list
                loadReviewStats();
            } else if (project.processing_status === 'failed') {
                message.error(`處理失敗: ${project.processing_error || '未知錯誤'}`);
            } else if (project.processing_status === 'completed_empty') {
                message.warning('處理完成，但沒有發現可導出的數據。');
            }
            return false;
        }
    } catch (error) {
        console.error('Failed to poll project status:', error);
        return false;
    }
  };

  useEffect(() => {
    // Cleanup polling on unmount
    return () => {
        if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  const handleOpenProcessModal = () => {
    loadProjects();
    setProcessModalVisible(true);
  };

  const handleExecuteProcessing = async () => {
    if (!selectedProjectId) {
      message.warning('請選擇要處理的專案');
      return;
    }

    try {
      setProcessingLoading(true);
      const url = `/projects/${selectedProjectId}/export${autoTrain ? '?auto_train=true' : ''}`;
      const response = await apiCall(url, {
        method: 'POST',
      });
      if (autoTrain) {
        message.success('數據導出已開始，完成後將自動訓練模型！');
      } else {
        message.success('已啟動資料處理程序 (後台執行中)');
      }
      setProcessModalVisible(false);
      
      // Show training command hint
      message.info(
        '資料將匯出至 training-data/exports/ 目錄。完成後請使用 train_model.py 進行訓練。',
        10 // 10 seconds
      );
      
      // Start polling
      if (pollInterval) clearInterval(pollInterval);
      const interval = setInterval(async () => {
          const isProcessing = await checkProjectStatus(selectedProjectId);
          if (!isProcessing) {
              clearInterval(interval);
              setPollInterval(null);
              setProcessingLoading(false);
          }
      }, 2000);
      setPollInterval(interval);

    } catch (error) {
      console.error('Failed to start processing:', error);
      message.error('啟動處理失敗');
      setProcessingLoading(false);
    }
  };

  // ... (Keep existing review handlers if needed, but maybe hide UI)

  useEffect(() => {
    loadPendingAnnotations();
    loadReviewStats();
  }, []);

  // 預覽點雲文件
  const handlePreviewPointCloud = async (annotation: Annotation) => {
    if (!annotation.pointcloud_file_id) return;
    
    try {
      setPreviewLoading(true);
      setPreviewVisible(true);
      
      // 下載文件 (Use proxy endpoint if needed, but here we download blob)
      // Note: In AnnotationPage we used proxy for streaming. Here fetch blob is fine if small or proxied.
      // Ideally use the same proxy logic if CORS is an issue.
      // For now, assume /files/download works or use the new proxy endpoint.
      // Let's use the proxy endpoint if available to be safe for local dev.
      const downloadUrl = `/api/v1/projects/${annotation.task_id /* We don't have project_id here easily... */}...`; 
      // Wait, annotation doesn't have project_id. 
      // Let's fallback to standard download and hope Vite proxy handles it or use relative path.
      
      const response = await fetch(`/api/v1/files/${annotation.pointcloud_file_id}/download`);
      if (!response.ok) throw new Error('Failed to download file');
      const arrayBuffer = await response.arrayBuffer();

      // 解析文件
      let pointCloudData;
      if (annotation.pointcloud_file_id) { // We assume NPZ based on system default
         try {
            pointCloudData = await extractPointCloudFromNpzBuffer(arrayBuffer);
         } catch (e) {
            // Fallback or retry?
            console.error(e);
         }
      }
      
      if (!pointCloudData) {
         // Fallback to NPY parser if NPZ failed or just try parseNpyFile
         const npyData = parseNpyFile(arrayBuffer);
         pointCloudData = {
           positions: npyData.data,
           pointCount: npyData.shape[0],
           bounds: calculateBounds(npyData.data)
         };
      }

      setPreviewData(pointCloudData);
    } catch (error) {
      console.error('Failed to preview point cloud:', error);
      message.error('預覽點雲失敗');
    } finally {
      setPreviewLoading(false);
    }
  };

  const columns = [
    {
      title: '標注ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => <Text code>{id.slice(0, 8)}...</Text>,
    },
    {
      title: '任務名稱',
      dataIndex: 'task_name',
      key: 'task_name',
      ellipsis: true,
    },
    {
      title: '標注員',
      dataIndex: 'annotator_name',
      key: 'annotator_name',
    },
    {
      title: '車種',
      dataIndex: 'vehicle_type_name',
      key: 'vehicle_type_name',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          submitted: { color: 'green', text: '已完成' },
          draft: { color: 'gray', text: '草稿' },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '提交時間',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record: Annotation) => (
        <Space size="small">
          {record.pointcloud_file_id && (
            <Button
              size="small"
              icon={<EyeInvisibleOutlined />}
              onClick={() => handlePreviewPointCloud(record)}
              title="預覽點雲"
            >
              預覽
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageLayout
      title="處理中心" // Renamed
      subtitle="管理和處理已提交的標注數據"
      extra={
        <Button 
            type="primary" 
            icon={<RocketOutlined />} 
            onClick={handleOpenProcessModal}
            size="large"
        >
            執行處理 (匯出至訓練程式)
        </Button>
      }
    >
        {/* 統計卡片 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="待處理標注" // Renamed
                value={stats.pending_reviews}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="已完成"
                value={stats.submitted_count}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="總標注數"
                value={stats.total_annotations}
                valueStyle={{ color: '#1890ff' }}
                prefix={<FolderOpenOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 待處理標注列表 */}
        <Card
          bordered={false}
          style={{ borderRadius: 12, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)' }}
          title="待處理標注列表"
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadPendingAnnotations}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={annotations}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 條記錄`,
            }}
            scroll={{ x: 1000 }}
          />
        </Card>

        {/* Processing Modal */}
        <Modal
            title="執行資料處理與訓練"
            open={processModalVisible}
            onCancel={() => setProcessModalVisible(false)}
            onOk={handleExecuteProcessing}
            confirmLoading={processingLoading}
            okText="開始處理"
            cancelText="取消"
            width={700}
        >
            <div style={{ marginBottom: 16 }}>
                <Text strong>此操作將執行以下步驟：</Text>
                <ol style={{ marginTop: 8, marginBottom: 16 }}>
                    <li>將已提交的標注數據匯出為 PointNet 訓練格式</li>
                    <li>按車種分類並分割為 train/test (90/10)</li>
                    <li>保存至 <Text code>training-data/exports/project_id_timestamp/</Text></li>
                </ol>
                
                <Checkbox 
                    checked={autoTrain} 
                    onChange={(e) => setAutoTrain(e.target.checked)}
                    style={{ marginBottom: 16 }}
                >
                    <Text strong>自動訓練模型</Text>
                    <div style={{ marginLeft: 24, marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            勾選後，數據導出完成會自動開始訓練 PointNet 模型（約 1-4 小時）
                        </Text>
                    </div>
                </Checkbox>
                
                <Text type="secondary" style={{ fontSize: '13px' }}>
                    💡 若不勾選自動訓練，導出完成後請使用以下命令手動訓練：
                </Text>
                <pre style={{ 
                    background: '#f5f5f5', 
                    padding: '12px', 
                    borderRadius: '4px',
                    marginTop: 8,
                    fontSize: '12px',
                    overflow: 'auto'
                }}>
{`cd backend
python train_model.py \\
  --data_dir ../training-data/exports/<導出目錄>/ \\
  --model pointnet_cls \\
  --epoch 200 \\
  --process_data`}
                </pre>
            </div>
            
            <div style={{ marginBottom: 16 }}>
                <Text strong>選擇要處理的專案：</Text>
            </div>
            <Select
                style={{ width: '100%' }}
                placeholder="選擇專案"
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                optionLabelProp="label"
            >
                {projects.map(p => (
                    <Select.Option key={p.id} value={p.id} label={p.name}>
                        <Space>
                            {p.name}
                            {p.is_processing && <Spin size="small" />}
                            {p.processing_status === 'completed' && <Tag color="success">已完成</Tag>}
                            {p.processing_status === 'failed' && <Tag color="error">失敗</Tag>}
                        </Space>
                    </Select.Option>
                ))}
            </Select>
        </Modal>

        {/* 點雲預覽 Modal */}
        <Modal
          title="點雲預覽"
          open={previewVisible}
          onCancel={() => {
            setPreviewVisible(false);
            setPreviewData(null);
          }}
          footer={null}
          width="80%"
          style={{ top: 20 }}
        >
          <Card 
            style={{ height: '70vh' }}
            bodyStyle={{ padding: 0, height: '100%' }}
          >
            {previewLoading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%' 
              }}>
                <Spin size="large" />
              </div>
            ) : previewData ? (
              <div style={{ height: '100%', width: '100%' }}>
                <PointCloudRenderer
                  ref={rendererRef}
                  data={previewData}
                  pointSize={2}
                  pointColor="#00ff00"
                  backgroundColor="#000000"
                />
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                color: '#999'
              }}>
                無預覽數據
              </div>
            )}
          </Card>
        </Modal>
    </PageLayout>
  );
};

export default ProcessingDashboard;
