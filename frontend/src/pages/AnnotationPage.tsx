import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Card,
  Space,
  Button,
  message,
  Breadcrumb,
  Row,
  Col,
  Spin,
  Alert,
  Tag,
  Divider
} from 'antd';
import {
  ArrowLeftOutlined,
  CarOutlined,
  BulbOutlined,
  EyeOutlined,
  FileTextOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import AnnotationTools from '../components/AnnotationTools';
import AnnotationViewer from '../components/AnnotationViewer';
import Navbar from '../components/Navbar';

const { Title, Text } = Typography;
const { Content } = Layout;

// Types
interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  pointCloudFile: string;
  progress: number;
}

interface VehicleType {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface Annotation {
  id?: string;
  taskId: string;
  vehicleTypeId?: string;
  confidence?: number;
  notes?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'needs_revision';
  annotationData?: any;
}

const AnnotationPage: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<any>({ indices: [], coordinates: [] });
  const [pointCloudData, setPointCloudData] = useState<Float32Array>();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [annotations] = useState<any[]>([]);

  // Mock data
  const mockVehicleTypes: VehicleType[] = [
    { id: '1', name: '小客車', code: 'CAR', description: '一般乘用車' },
    { id: '2', name: '貨車', code: 'TRUCK', description: '商用貨車' },
    { id: '3', name: '機車', code: 'MOTORCYCLE', description: '機車、摩托車' },
    { id: '4', name: '巴士', code: 'BUS', description: '公共巴士' },
    { id: '5', name: '休旅車', code: 'SUV', description: '運動型多用途車' },
  ];

  // Initialize data
  useEffect(() => {
    loadData();
  }, [taskId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock task data
      const mockTask: Task = {
        id: taskId || '1',
        name: `點雲標注任務 ${taskId}`,
        description: '對指定區域的車輛進行類型標注',
        status: 'assigned',
        pointCloudFile: `pointcloud_${taskId}.npy`,
        progress: 30
      };

      // Mock point cloud data (30k points)
      const mockData = new Float32Array(
        Array.from({length: 30000}, () => Math.random() * 10 - 5)
      );

      setTask(mockTask);
      setPointCloudData(mockData);
      setVehicleTypes(mockVehicleTypes);

      // Check for existing annotation
      const existingAnnotation = localStorage.getItem(`annotation_${taskId}`);
      if (existingAnnotation) {
        const annotation = JSON.parse(existingAnnotation);
        setCurrentAnnotation(annotation);
        if (annotation.annotationData?.selected_points) {
          setSelectedPoints({
            indices: annotation.annotationData.selected_points,
            coordinates: annotation.annotationData.point_coordinates || []
          });
        }
      }

      message.success('標注環境載入完成');
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('載入數據失敗');
    } finally {
      setLoading(false);
    }
  };

  // Handle points selection
  const handlePointsSelect = (points: any) => {
    setSelectedPoints(points);
    console.log('Selected points:', points);
  };

  // Handle save annotation
  const handleSaveAnnotation = async (annotationData: any) => {
    try {
      setLoading(true);
      
      const annotation: Annotation = {
        id: currentAnnotation?.id || Date.now().toString(),
        taskId: taskId!,
        vehicleTypeId: annotationData.vehicleTypeId,
        confidence: annotationData.confidence,
        notes: annotationData.notes,
        status: 'draft',
        annotationData: annotationData.annotation_data
      };

      // Save to localStorage (simulate API)
      localStorage.setItem(`annotation_${taskId}`, JSON.stringify(annotation));
      setCurrentAnnotation(annotation);

      message.success('標注已保存為草稿');
    } catch (error) {
      console.error('Error saving annotation:', error);
      message.error('保存標注失敗');
    } finally {
      setLoading(false);
    }
  };

  // Handle submit annotation
  const handleSubmitAnnotation = async (annotationData: any) => {
    try {
      setLoading(true);

      const annotation: Annotation = {
        id: currentAnnotation?.id || Date.now().toString(),
        taskId: taskId!,
        vehicleTypeId: annotationData.vehicleTypeId,
        confidence: annotationData.confidence,
        notes: annotationData.notes,
        status: 'submitted',
        annotationData: annotationData.annotation_data
      };

      // Save to localStorage (simulate API)
      localStorage.setItem(`annotation_${taskId}`, JSON.stringify(annotation));
      setCurrentAnnotation(annotation);

      message.success('標注已提交審核');
      
      // Redirect after successful submission
      setTimeout(() => {
        navigate(`/projects/${projectId}/tasks`);
      }, 2000);
    } catch (error) {
      console.error('Error submitting annotation:', error);
      message.error('提交標注失敗');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete annotation
  const handleDeleteAnnotation = () => {
    localStorage.removeItem(`annotation_${taskId}`);
    setCurrentAnnotation(null);
    setSelectedPoints({ indices: [], coordinates: [] });
    message.success('標注已刪除');
  };

  // Get status info
  const getStatusInfo = (status: string) => {
    const statusMap = {
      draft: { color: 'default', text: '草稿' },
      submitted: { color: 'processing', text: '審核中' },
      approved: { color: 'success', text: '已通過' },
      rejected: { color: 'error', text: '已拒絕' },
      needs_revision: { color: 'warning', text: '需修改' }
    };
    return statusMap[status as keyof typeof statusMap] || { color: 'default', text: '未知' };
  };

  if (loading && !task) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '50px' }}>
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text>載入標注環境中...</Text>
            </div>
          </div>
        </Content>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '50px' }}>
          <Alert
            message="載入失敗"
            description="無法載入任務信息，請重試"
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => navigate(-1)}>
                返回
              </Button>
            }
          />
        </Content>
      </Layout>
    );
  }

  const statusInfo = currentAnnotation ? getStatusInfo(currentAnnotation.status) : null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navbar />
      
      {/* Content */}
      <Content style={{ padding: '24px', paddingTop: '88px' }}>
        {/* Navigation */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => navigate(-1)}
                >
                  返回
                </Button>
                
                <Divider type="vertical" />
                
                <Breadcrumb>
                  <Breadcrumb.Item>專案管理</Breadcrumb.Item>
                  <Breadcrumb.Item>任務列表</Breadcrumb.Item>
                  <Breadcrumb.Item>標注任務</Breadcrumb.Item>
                </Breadcrumb>
              </Space>
            </Col>
            
            <Col>
              <Space>
                {statusInfo && (
                  <Tag color={statusInfo.color} icon={<ClockCircleOutlined />}>
                    {statusInfo.text}
                  </Tag>
                )}
                
                <Tag color="blue" icon={<FileTextOutlined />}>
                  {task.pointCloudFile}
                </Tag>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Task Info */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={24} align="middle">
            <Col flex="auto">
              <Space>
                <CarOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {task.name}
                  </Title>
                  <Text type="secondary">{task.description}</Text>
                </div>
              </Space>
            </Col>
            
            <Col>
              <Space size="large">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                    {selectedPoints.indices.length}
                  </div>
                  <Text type="secondary">已選點數</Text>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                    {Math.floor((pointCloudData?.length || 0) / 3).toLocaleString()}
                  </div>
                  <Text type="secondary">總點數</Text>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Main Content */}
        <div style={{ height: 'calc(100vh - 320px)', display: 'flex', gap: 16 }}>
          {/* 3D Viewer */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <Card 
              title={
                <Space>
                  <EyeOutlined />
                  <span>3D 點雲視圖</span>
                  <Tag color="green">
                    <BulbOutlined /> 標注模式
                  </Tag>
                </Space>
              }
              style={{ height: '100%' }}
              bodyStyle={{ height: 'calc(100% - 57px)', padding: 0 }}
            >
              <AnnotationViewer
                pointCloudData={pointCloudData}
                annotations={annotations}
                isSelectionMode={true}
                selectedPoints={selectedPoints}
                onPointsSelect={handlePointsSelect}
                showStats={true}
              />
            </Card>
          </div>
          
          {/* Annotation Tools */}
          <div style={{ width: 400, minHeight: 0 }}>
            <AnnotationTools
              annotation={currentAnnotation || undefined}
              vehicleTypes={vehicleTypes}
              selectedPoints={selectedPoints}
              onSave={handleSaveAnnotation}
              onSubmit={handleSubmitAnnotation}
              onDelete={currentAnnotation ? handleDeleteAnnotation : undefined}
              isLoading={loading}
            />
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default AnnotationPage; 