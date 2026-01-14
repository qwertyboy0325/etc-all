import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Card,
  Space,
  Button,
  App,
  Breadcrumb,
  Row,
  Col,
  Spin,
  Alert,
  Tag,
  Divider,
  Select
} from 'antd';
import {
  ArrowLeftOutlined,
  CarOutlined,
  BulbOutlined,
  EyeOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  LeftOutlined,
  RightOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import AnnotationTools from '../components/AnnotationTools';
import AnnotationViewer from '../components/AnnotationViewer';
import Navbar from '../components/Navbar';
import { apiCall, getAuthHeaders } from '../utils/api';
import { parseNpyFile } from '../utils/npyParser';
import { useAuth, usePermissions } from '../contexts/AuthContext';

const { Title, Text } = Typography;
const { Content } = Layout;

// Types
interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  files: { id: string; original_filename: string }[];
  assigned_to?: string;
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
  status: 'draft' | 'submitted';
  annotationData?: any;
}

const AnnotationPage: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user } = useAuth();
  const { isAdmin, isSystemAdmin } = usePermissions();
  const canManage = isAdmin || isSystemAdmin;

  // State
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [pointCloudData, setPointCloudData] = useState<Float32Array>();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]); // All task annotations
  const [visibleAnnotations, setVisibleAnnotations] = useState<any[]>([]); // Filtered by file

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
    loadTaskAndMeta();
  }, [taskId]);

  // Load file when selection changes
  useEffect(() => {
    if (selectedFileId) {
        loadFile(selectedFileId);
    }
  }, [selectedFileId]);

  // Filter annotations when file or annotations change
  useEffect(() => {
      if (selectedFileId && annotations.length > 0) {
          const filtered = annotations.filter(a => a.pointcloudFileId === selectedFileId || !a.pointcloudFileId);
          setVisibleAnnotations(filtered);
          
          // Also sync currentAnnotation for editing if it exists
          // Note: annotations list has mapped structure, we need to map back or find better way
          // But loadTaskAndMeta loads ALL annotations.
          // Let's see if we can find the one for this file.
          const existing = filtered.find(a => a.pointcloudFileId === selectedFileId);
          if (existing) {
              // We need full annotation object for editing, but 'annotations' state only has simplified view
              // Ideally we should reload annotations for the specific file or store full objects
              // For now, let's fetch specific annotation for this file if we are switching files
              // Or better: re-fetch task annotations when switching files? No, that's slow.
              
              // Let's assume we can edit if we find it.
              // We need the ID to update.
              // loadTaskAndMeta fetches ALL.
              // Let's fetch the annotation details again to be safe and get full object
              // apiCall(`/projects/${projectId}/annotations/${existing.id}`).then(...)
              // But simpler: just clear currentAnnotation and let user create new one or 
              // IF we want to support editing existing ones when switching back and forth:
              
              // Re-fetch annotation for this file
              // Find annotation with this file_id
              const targetAnn = annotations.find(a => a.pointcloudFileId === selectedFileId);
              if (targetAnn) {
                  // Fetch full details
                  apiCall(`/projects/${projectId}/annotations/${targetAnn.id}`)
                    .then(res => {
                        setCurrentAnnotation({
                            id: res.id,
                            taskId: res.task_id,
                            vehicleTypeId: res.vehicle_type_id,
                            confidence: res.confidence,
                            notes: res.notes,
                            status: res.status,
                            annotationData: res.annotation_data
                        });
                    })
                    .catch(() => setCurrentAnnotation(null));
              } else {
                  setCurrentAnnotation(null);
              }
          } else {
              setCurrentAnnotation(null);
          }
      } else {
          setVisibleAnnotations([]);
          setCurrentAnnotation(null);
      }
  }, [selectedFileId, annotations]);

  const loadTaskAndMeta = async () => {
    if (!projectId || !taskId) return;
    setLoading(true);
    try {
      // 1) 任務詳情
      const taskResp = await apiCall(`/projects/${projectId}/tasks/${taskId}`);
      
      // Permission Check
      const assigneeId = taskResp.assigned_to || taskResp.assignee?.id;
      if (!canManage) {
          if (assigneeId && assigneeId !== user?.id) {
             message.error('您沒有權限進入此標註任務 (非指派者)');
             navigate(-1);
             return;
          }
          if (!assigneeId) {
             message.error('此任務尚未指派');
             navigate(-1);
             return;
          }
      }

      setTask({
        id: taskResp.id,
        name: taskResp.name,
        description: taskResp.description,
        status: taskResp.status,
        files: taskResp.files || [],
        assigned_to: assigneeId,
        progress: 0,
      });

      // Set default file
      if (taskResp.files && taskResp.files.length > 0) {
          setSelectedFileId(taskResp.files[0].id);
      }

      // 2) 載入任務既有標注 (All)
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
          pointcloudFileId: a.pointcloud_file_id, // For filtering
        }));
        setAnnotations(mapped);
      } catch (_) {
        // ignore listing error
      }

      // 3) 車種列表
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

    } catch (error) {
      console.error('Error loading data:', error);
      message.error('載入數據失敗');
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (fileId: string) => {
      if (!projectId || !fileId) return;
      setLoading(true);
      try {
        // Use proxy endpoint to stream file through backend
        // This avoids CORS and DNS resolution issues with MinIO signed URLs
        const url = `/api/v1/projects/${projectId}/files/${fileId}/proxy`;
        
        const binResp = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (!binResp.ok) throw new Error(`下載失敗 HTTP ${binResp.status}`);
        if (!binResp.ok) throw new Error(`下載失敗 HTTP ${binResp.status}`);
        const arrayBuf = await binResp.arrayBuffer();
        
        const fileInfo = task?.files.find(f => f.id === fileId);
        const filename = fileInfo?.original_filename || '';
        
        // Parse based on extension? The parser handles check.
        // We need to know if it is NPZ from filename usually
        // Or just try.
        
        // Note: extractPointCloudFromNpzBuffer is used if npz
        // parseNpyFile if npy.
        // We need logic here.
        
        let parsedData;
        if (filename.toLowerCase().endsWith('.npz')) {
             // Need to import extractPointCloudFromNpzBuffer (already imported)
             // But wait, extractPointCloudFromNpzBuffer returns { positions: ..., ... } object usually?
             // Or raw array? 
             // Looking at TaskList.tsx: pointCloudData = await extractPointCloudFromNpzBuffer(...)
             // In utils/npzParser.ts: returns { positions: Float32Array, ... }
             
             // But AnnotationPage previously used: 
             // const parsed = parseNpyFile(arrayBuf); 
             // setPointCloudData(parsed.data);
             
             // I need to support both.
             
             const { extractPointCloudFromNpzBuffer } = await import('../utils/npzParser');
             const result = await extractPointCloudFromNpzBuffer(arrayBuf);
             parsedData = result.positions;
        } else {
             const parsed = parseNpyFile(arrayBuf);
             parsedData = parsed.data;
        }
        
        setPointCloudData(parsedData);
        message.success(`已載入檔案: ${filename}`);
        
      } catch (e) {
          console.error(e);
          message.error('載入點雲檔案失敗');
      } finally {
          setLoading(false);
      }
  };

  // Handle points selection
  // const handlePointsSelect = (points: any) => {
  //   setSelectedPoints(points);
  //   console.log('Selected points:', points);
  // };

  // Handle save annotation
  const handleSaveAnnotation = async (annotationData: any) => {
    if (!projectId || !taskId) return;
    try {
      setLoading(true);
      const payload = {
        task_id: taskId,
        pointcloud_file_id: selectedFileId,
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
              pointcloud_file_id: selectedFileId,
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
      message.success('標注已提交處理');
      
      // Auto navigate to next file
      if (task?.files && task.files.length > 1) {
        const currentIndex = task.files.findIndex(f => f.id === selectedFileId);
        if (currentIndex < task.files.length - 1) {
            const nextFileId = task.files[currentIndex + 1].id;
            setTimeout(() => setSelectedFileId(nextFileId), 500);
            return;
        }
      }
      
      // If no next file or last file, go back
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
      submitted: { color: 'success', text: '已完成' },
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

  // File navigation handlers
  const handlePrevFile = () => {
    if (!task?.files || task.files.length <= 1) return;
    const currentIndex = task.files.findIndex(f => f.id === selectedFileId);
    if (currentIndex > 0) {
      setSelectedFileId(task.files[currentIndex - 1].id);
    } else {
        // Wrap around to last? or just stop? Let's stop for now or loop. User asked for "album like", usually loops or stops. 
        // Let's just stop at edges to avoid confusion, or loop if preferred. Let's stop.
        message.info('已經是第一個檔案');
    }
  };

  const handleNextFile = () => {
    if (!task?.files || task.files.length <= 1) return;
    const currentIndex = task.files.findIndex(f => f.id === selectedFileId);
    if (currentIndex < task.files.length - 1) {
      setSelectedFileId(task.files[currentIndex + 1].id);
    } else {
        message.info('已經是最後一個檔案');
    }
  };

  // Helper to check if file has completed annotation
  const getFileStatusIcon = (fileId: string) => {
      const ann = annotations.find(a => a.pointcloudFileId === fileId);
      if (ann && ann.status === 'submitted') {
          return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      }
      return null;
  };

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
                
                <Breadcrumb
                  items={[
                    { title: '專案管理' },
                    { title: '任務列表' },
                    { title: '標注任務' }
                  ]}
                />
              </Space>
            </Col>
            
            <Col>
              <Space>
                {statusInfo && (
                  <Tag color={statusInfo.color} icon={<ClockCircleOutlined />}>
                    {statusInfo.text}
                  </Tag>
                )}
                
                {/* File Switcher */}
                {task?.files && task.files.length > 1 ? (
                    <Space>
                        <Button 
                            icon={<LeftOutlined />} 
                            onClick={handlePrevFile}
                            disabled={task.files.findIndex(f => f.id === selectedFileId) === 0}
                        />
                        <Select 
                            value={selectedFileId}
                            onChange={setSelectedFileId}
                            style={{ minWidth: 250 }}
                            options={task.files.map(f => ({ 
                                label: (
                                    <Space>
                                        <span>{f.original_filename}</span>
                                        {getFileStatusIcon(f.id)}
                                    </Space>
                                ), 
                                value: f.id 
                            }))}
                            placeholder="切換檔案"
                        />
                        <Button 
                            icon={<RightOutlined />} 
                            onClick={handleNextFile}
                            disabled={task.files.findIndex(f => f.id === selectedFileId) === task.files.length - 1}
                        />
                    </Space>
                ) : (
                    task?.files && task.files.length > 0 && (
                        <Tag color="blue" icon={<FileTextOutlined />}>
                            {task.files[0].original_filename}
                        </Tag>
                    )
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
                </Space>
              }
              style={{ height: '100%' }}
              styles={{ body: { height: 'calc(100% - 57px)', padding: 0 } }}
            >
              <AnnotationViewer
                pointCloudData={pointCloudData}
                annotations={visibleAnnotations}
                showStats={true}
              />
            </Card>
          </div>
          
          {/* Annotation Tools */}
          <div style={{ width: 400, minHeight: 0 }}>
            <AnnotationTools
              annotation={currentAnnotation || undefined}
              vehicleTypes={vehicleTypes}
              selectedPoints={{ indices: [], coordinates: [] }}
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