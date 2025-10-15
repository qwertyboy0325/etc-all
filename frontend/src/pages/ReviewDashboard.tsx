import React, { useState, useEffect, useRef } from 'react';
import {
  Layout,
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
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { apiCall } from '../utils/api';
import PointCloudRenderer, { PointCloudRendererRef } from '../components/PointCloudRenderer';
import { parseNpyFile, calculateBounds } from '../utils/npyParser';
import { extractPointCloudFromNpzBuffer } from '../utils/npzParser';

const { Content } = Layout;
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

const ReviewDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    approved_count: 0,
    rejected_count: 0,
    average_quality: 0,
  });

  // 載入待審核標注
  const loadPendingAnnotations = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/annotations/?status=pending_review', {
        method: 'GET',
      });
      setAnnotations(response.data || []);
    } catch (error) {
      console.error('Failed to load pending annotations:', error);
      message.error('載入待審核標注失敗');
    } finally {
      setLoading(false);
    }
  };

  // 載入審核統計
  const loadReviewStats = async () => {
    try {
      const response = await apiCall('/reviews/stats', {
        method: 'GET',
      });
      setStats(response.data || stats);
    } catch (error) {
      console.error('Failed to load review stats:', error);
    }
  };

  // 提交審核
  const handleReviewSubmit = async (values: ReviewFormData) => {
    if (!selectedAnnotation) return;

    try {
      setLoading(true);
      await apiCall(`/annotations/${selectedAnnotation.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          status: values.status,
          feedback: values.feedback,
          quality_score: values.quality_score,
        }),
      });

      message.success('審核提交成功');
      setReviewModalVisible(false);
      reviewForm.resetFields();
      setSelectedAnnotation(null);
      loadPendingAnnotations();
      loadReviewStats();
    } catch (error) {
      console.error('Failed to submit review:', error);
      message.error('審核提交失敗');
    } finally {
      setLoading(false);
    }
  };

  // 快速審核
  const handleQuickReview = async (annotationId: string, status: string) => {
    try {
      setLoading(true);
      await apiCall(`/annotations/${annotationId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          feedback: status === 'approved' ? '快速通過' : '需要改進',
          quality_score: status === 'approved' ? 8 : 5,
        }),
      });

      message.success(`標注已${status === 'approved' ? '通過' : '拒絕'}`);
      loadPendingAnnotations();
      loadReviewStats();
    } catch (error) {
      console.error('Failed to quick review:', error);
      message.error('快速審核失敗');
    } finally {
      setLoading(false);
    }
  };

  // 批量審核
  const handleBulkReview = async (selectedAnnotations: string[], status: string) => {
    try {
      setLoading(true);
      const reviews = selectedAnnotations.map(id => ({
        annotation_id: id,
        status,
        feedback: status === 'approved' ? '批量通過' : '批量拒絕',
        quality_score: status === 'approved' ? 7 : 4,
      }));

      await apiCall('/reviews/bulk', {
        method: 'POST',
        body: JSON.stringify(reviews),
      });

      message.success(`批量${status === 'approved' ? '通過' : '拒絕'}完成`);
      loadPendingAnnotations();
      loadReviewStats();
    } catch (error) {
      console.error('Failed to bulk review:', error);
      message.error('批量審核失敗');
    } finally {
      setLoading(false);
    }
  };

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
      
      // 下載文件
      const response = await fetch(`/api/v1/files/${annotation.pointcloud_file_id}/download`);
      if (!response.ok) throw new Error('Failed to download file');
      const arrayBuffer = await response.arrayBuffer();

      // 解析文件
      let pointCloudData;
      if (annotation.pointcloud_file?.original_filename?.endsWith('.npz')) {
        pointCloudData = await extractPointCloudFromNpzBuffer(arrayBuffer);
      } else {
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
      title: '信心度',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (confidence: number) => (
        <Progress
          percent={Math.round(confidence * 100)}
          size="small"
          status={confidence > 0.8 ? 'success' : confidence > 0.6 ? 'normal' : 'exception'}
        />
      ),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          pending_review: { color: 'orange', text: '待審核' },
          approved: { color: 'green', text: '已通過' },
          rejected: { color: 'red', text: '已拒絕' },
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
      width: 200,
      render: (_, record: Annotation) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedAnnotation(record);
              setReviewModalVisible(true);
            }}
          >
            審核
          </Button>
          {record.pointcloud_file_id && (
            <Button
              size="small"
              icon={<EyeInvisibleOutlined />}
              onClick={() => handlePreviewPointCloud(record)}
              title="預覽點雲"
            >
              點雲
            </Button>
          )}
          <Button
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handleQuickReview(record.id, 'approved')}
            loading={loading}
          >
            通過
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => handleQuickReview(record.id, 'rejected')}
            loading={loading}
          >
            拒絕
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navbar title="審核中心" />
      <Content style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2}>審核中心</Title>
          <Text type="secondary">管理和審核標注結果</Text>
        </div>

        {/* 統計卡片 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="待審核標注"
                value={stats.pending_reviews}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已通過"
                value={stats.approved_count}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已拒絕"
                value={stats.rejected_count}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均質量"
                value={stats.average_quality}
                precision={1}
                suffix="/ 10"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 待審核標注列表 */}
        <Card
          title="待審核標注"
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadPendingAnnotations}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => {
                  // 批量通過選中的標注
                  const selectedIds = annotations.map(a => a.id);
                  handleBulkReview(selectedIds, 'approved');
                }}
                loading={loading}
              >
                批量通過
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
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* 審核模態框 */}
        <Modal
          title="審核標注"
          open={reviewModalVisible}
          onCancel={() => {
            setReviewModalVisible(false);
            setSelectedAnnotation(null);
            reviewForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          {selectedAnnotation && (
            <div>
              <Card size="small" style={{ marginBottom: '16px' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>標注員：</Text>
                    <Text>{selectedAnnotation.annotator_name}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>車種：</Text>
                    <Tag color="blue">{selectedAnnotation.vehicle_type_name}</Tag>
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: '8px' }}>
                  <Col span={12}>
                    <Text strong>信心度：</Text>
                    <Progress
                      percent={Math.round(selectedAnnotation.confidence * 100)}
                      size="small"
                    />
                  </Col>
                  <Col span={12}>
                    <Text strong>提交時間：</Text>
                    <Text>{new Date(selectedAnnotation.submitted_at).toLocaleString()}</Text>
                  </Col>
                </Row>
              </Card>

              <Form
                form={reviewForm}
                layout="vertical"
                onFinish={handleReviewSubmit}
                initialValues={{
                  quality_score: 7,
                }}
              >
                <Form.Item
                  name="status"
                  label="審核結果"
                  rules={[{ required: true, message: '請選擇審核結果' }]}
                >
                  <Select placeholder="選擇審核結果">
                    <Option value="approved">通過</Option>
                    <Option value="rejected">拒絕</Option>
                    <Option value="requires_revision">需要修改</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="quality_score"
                  label="質量評分"
                  rules={[{ required: true, message: '請評分' }]}
                >
                  <Rate count={10} />
                </Form.Item>

                <Form.Item
                  name="feedback"
                  label="審核意見"
                >
                  <TextArea
                    rows={4}
                    placeholder="請輸入審核意見..."
                    maxLength={500}
                    showCount
                  />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      提交審核
                    </Button>
                    <Button onClick={() => setReviewModalVisible(false)}>
                      取消
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </div>
          )}
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
      </Content>
    </Layout>
  );
};

export default ReviewDashboard;
