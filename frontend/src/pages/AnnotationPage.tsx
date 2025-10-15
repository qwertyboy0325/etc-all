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
import { apiCall } from '../utils/api';
import { parseNpyFile } from '../utils/npyParser';

const { Title, Text } = Typography;
const { Content } = Layout;

// Types
interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  pointCloudFile?: string;
  pointcloud_file_id?: string;
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
  const [annotations, setAnnotations] = useState<any[]>([]);

  // 車種：優先從後端載入，失敗則退回靜態清單
  const fallbackVehicleTypes: VehicleType[] = [
    { id: 'car', name: '小客車', code: 'CAR', description: '一般乘用車' },
    { id: 'truck', name: '貨車', code: 'TRUCK', description: '商用貨車' },
    { id: 'motorcycle', name: '機車', code: 'MOTORCYCLE', description: '機車、摩托車' },
    { id: 'bus', name: '巴士', code: 'BUS', description: '公共巴士' },
    { id: 'suv', name: '休旅車', code: 'SUV', description: '運動型多用途車' },
  ];

  // Initialize data
  useEffect(() => {
    loadData();
  }, [taskId]);

  const loadData = async () => {
    if (!projectId || !taskId) return;
    setLoading(true);
    try {
      // 1) 任務詳情
      const taskResp = await apiCall(`/projects/${projectId}/tasks/${taskId}`);
      setTask({
        id: taskResp.id,
        name: taskResp.name,
        description: taskResp.description,
        status: taskResp.status,
        pointCloudFile: taskResp.pointcloud_file?.original_filename,
        pointcloud_file_id: taskResp.pointcloud_file_id,
        progress: 0,
      });

      // 2) 檔案下載 URL -> 下載 NPY -> 解析
      if (!taskResp.pointcloud_file_id) throw new Error('任務缺少點雲文件');
      const dl = await apiCall(`/projects/${projectId}/files/${taskResp.pointcloud_file_id}/download`);
      const url: string = dl.download_url || dl.url || dl.downloadUrl;
      if (!url) throw new Error('無法取得下載連結');
      const binResp = await fetch(url);
      if (!binResp.ok) throw new Error(`下載失敗 HTTP ${binResp.status}`);
      const arrayBuf = await binResp.arrayBuffer();
      const parsed = parseNpyFile(arrayBuf);
      setPointCloudData(parsed.data);

      // 3) 載入任務既有標注
      try {
        const annList = await apiCall(`/projects/${projectId}/tasks/${taskId}/annotations`);
        const colorPalette = ['#ff7875', '#ffa940', '#ffd666', '#95de64', '#5cdbd3', '#69c0ff', '#b37feb', '#ff85c0'];
        const mapped = (annList || []).map((a: any, idx: number) => ({
          id: a.id,
          vehicleType: a.vehicle_type_id || a.vehicleTypeId || 'unknown',
          confidence: a.confidence ?? 0.8,
          points: a.annotation_data?.selected_points || [],
          color: colorPalette[idx % colorPalette.length],
          visible: true,
        }));
        setAnnotations(mapped);
      } catch (_) {
        // ignore listing error to not block page
      }

      // 4) 車種列表
      try {
        const vts = await apiCall(`/projects/${projectId}/vehicle-types`);
        const mappedVTs: VehicleType[] = (vts || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          code: v.code,
          description: v.description,
        }));
        setVehicleTypes(mappedVTs.length > 0 ? mappedVTs : fallbackVehicleTypes);
      } catch (_) {
        setVehicleTypes(fallbackVehicleTypes);
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
    if (!projectId || !taskId) return;
    try {
      setLoading(true);
      const payload = {
        task_id: taskId,
        vehicle_type_id: annotationData.vehicleTypeId,
        confidence: annotationData.confidence,
        notes: annotationData.notes,
        annotation_data: annotationData.annotation_data,
      };
      const res = await apiCall(`/projects/${projectId}/annotations`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setCurrentAnnotation({
        id: res.id,
        taskId: res.task_id || taskId,
        vehicleTypeId: res.vehicle_type_id || annotationData.vehicleTypeId,
        confidence: res.confidence ?? annotationData.confidence,
        notes: res.notes ?? annotationData.notes,
        status: res.status || 'draft',
        annotationData: res.annotation_data || annotationData.annotation_data,
      });
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
    if (!projectId || !taskId) return;
    try {
      setLoading(true);
      let annotationId = currentAnnotation?.id;
      if (!annotationId) {
        // 先建立
        const createRes = await apiCall(`/projects/${projectId}/annotations`, {
          method: 'POST',
          body: JSON.stringify({
            task_id: taskId,
            vehicle_type_id: annotationData.vehicleTypeId,
            confidence: annotationData.confidence,
            notes: annotationData.notes,
            annotation_data: annotationData.annotation_data,
          }),
        });
        annotationId = createRes.id;
        setCurrentAnnotation({
          id: createRes.id,
          taskId,
          vehicleTypeId: createRes.vehicle_type_id || annotationData.vehicleTypeId,
          confidence: createRes.confidence ?? annotationData.confidence,
          notes: createRes.notes ?? annotationData.notes,
          status: createRes.status || 'draft',
          annotationData: createRes.annotation_data || annotationData.annotation_data,
        });
      }

      // 提交審核
      const submitRes = await apiCall(`/projects/${projectId}/annotations/${annotationId}/submit`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setCurrentAnnotation(prev => prev ? { ...prev, status: submitRes.status || 'submitted' } : prev);
      message.success('標注已提交審核');
      setTimeout(() => navigate(`/projects/${projectId}/tasks`), 1200);
    } catch (error) {
      console.error('Error submitting annotation:', error);
      message.error('提交標注失敗');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete annotation
  const handleDeleteAnnotation = async () => {
    if (!projectId || !currentAnnotation?.id) {
      message.warning('無草稿可刪除');
      return;
    }
    try {
      setLoading(true);
      await apiCall(`/projects/${projectId}/annotations/${currentAnnotation.id}`, { method: 'DELETE' });
      setCurrentAnnotation(null);
      setSelectedPoints({ indices: [], coordinates: [] });
      message.success('標注已刪除');
    } catch (error) {
      console.error('Error deleting annotation:', error);
      message.error('刪除標注失敗');
    } finally {
      setLoading(false);
    }
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
      <Content style={{ padding: '24px', paddingTop: '104px' }}>
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
                
                  {task.pointCloudFile && (
                    <Tag color="blue" icon={<FileTextOutlined />}>
                      {task.pointCloudFile}
                    </Tag>
                  )}
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