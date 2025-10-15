import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Card,
  Button,
  Space,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  Upload
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { apiCall } from '../utils/api';
import { uploadProjectFile, uploadProjectFiles, uploadProjectArchive, type FileUploadResponse } from '../services/fileService';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Types
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  taskCount: number;
  completedTasks: number;
  progress: number;
}

interface ProjectFormData {
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
}

const ProjectManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canCreateProjects, isSystemAdmin } = usePermissions();

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [bulkTargetProjectId, setBulkTargetProjectId] = useState<string | null>(null);
  const [assignAdminOpen, setAssignAdminOpen] = useState<{open: boolean, projectId?: string}>({ open: false });
  const [assignUserId, setAssignUserId] = useState<string | undefined>();
  const [userOptions, setUserOptions] = useState<{label: string, value: string}[]>([]);

  const openAssignAdmin = async (projectId: string) => {
    setAssignAdminOpen({ open: true, projectId });
    setAssignUserId(undefined);
    try {
      const data = await apiCall('/users');
      const opts = (Array.isArray(data) ? data : data.items || []).map((u: any) => ({ label: u.full_name || u.email, value: u.id }));
      setUserOptions(opts);
    } catch (e: any) {
      message.error(e?.message || '載入使用者失敗');
    }
  };

  const doAssignAdmin = async () => {
    if (!assignAdminOpen.projectId || !assignUserId) return;
    try {
      await apiCall(`/projects/${assignAdminOpen.projectId}/members/assign-admin?user_id=${assignUserId}`, { method: 'POST' });
      message.success('已指派為專案管理員');
      setAssignAdminOpen({ open: false });
    } catch (e: any) {
      message.error(e?.message || '指派失敗');
    }
  };

  // Load projects
  useEffect(() => {
    loadProjects();
  }, []);

  // Removed mock data generation

  const loadProjects = async () => {
    setLoading(true);
    try {
      // Use real API only
      const data = await apiCall('/projects', { method: 'GET' });

      setProjects(Array.isArray(data) ? data : (data as any)?.items || []);
    } catch (error) {
      console.error('Load projects error:', error);
      message.error('載入專案失敗');
    } finally {
      setLoading(false);
    }
  };

  // Handle create/edit project
  const handleSubmit = async (values: ProjectFormData) => {
    try {
      if (editingProject) {
        // Update project - 目前只在前端更新，後續需要實現後端API
        const updatedProject = {
          ...editingProject,
          ...values,
          updatedAt: new Date().toISOString()
        };
        setProjects(prev => prev.map(p => p.id === editingProject.id ? updatedProject : p));
        message.success('專案更新成功');
      } else {
        // Create new project - 調用後端API
        const projectData = {
          name: values.name,
          description: values.description,
          is_public: false,
          max_annotations_per_task: 3,
          auto_assign_tasks: true,
          require_review: true
        };

        const createdProject = await apiCall('/projects', {
          method: 'POST',
          body: JSON.stringify(projectData)
        });

        // 處理API響應格式差異
        const newProject: Project = {
          id: (createdProject as any).id || Date.now().toString(),
          name: (createdProject as any).name,
          description: (createdProject as any).description || '',
          status: (createdProject as any).status || 'active',
          createdBy: (createdProject as any).created_by || user?.id || '1',
          createdAt: (createdProject as any).created_at || (createdProject as any).createdAt || new Date().toISOString(),
          updatedAt: (createdProject as any).updated_at || (createdProject as any).updatedAt || new Date().toISOString(),
          memberCount: 1,
          taskCount: (createdProject as any).total_tasks || 0,
          completedTasks: (createdProject as any).completed_tasks || 0,
          progress: (createdProject as any).total_tasks > 0 
            ? Math.round(((createdProject as any).completed_tasks / (createdProject as any).total_tasks) * 100) 
            : 0
        };

        // Debug: 輸出創建的專案數據
        console.log('Created project data:', {
          originalResponse: createdProject,
          processedProject: newProject,
          createdAtValue: newProject.createdAt,
          createdAtValid: !isNaN(new Date(newProject.createdAt).getTime())
        });

        setProjects(prev => [newProject, ...prev]);
        message.success('專案創建成功');
      }

      setIsModalVisible(false);
      setEditingProject(null);
      form.resetFields();
    } catch (error) {
      console.error('Submit project error:', error);
      message.error('操作失敗');
    }
  };

  // Handle delete project
  const handleDelete = async (projectId: string) => {
    try {
      await apiCall(`/projects/${projectId}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== projectId));
      message.success('專案删除成功');
    } catch (error: any) {
      console.error('Delete project error:', error);
      message.error(error?.message || '删除失敗');
    }
  };

  // Open modal for create/edit
  const openModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      form.setFieldsValue(project);
    } else {
      setEditingProject(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  // Table columns
  const columns: ColumnsType<Project> = [
    {
      title: '專案名稱',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Project) => (
        <div>
          <Text strong style={{ display: 'block' }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.id}
          </Text>
        </div>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
            {text}
          </Paragraph>
        </Tooltip>
      )
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          active: { color: 'green', text: '進行中' },
          completed: { color: 'blue', text: '已完成' },
          paused: { color: 'orange', text: '暫停' },
          archived: { color: 'default', text: '已歸檔' }
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '進度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number, record: Project) => (
        <div>
          <Progress percent={progress} size="small" />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.completedTasks}/{record.taskCount} 任務
          </Text>
        </div>
      )
    },
    {
      title: '成員',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 80,
      render: (count: number) => (
        <Space>
          <TeamOutlined />
          <Text>{count}</Text>
        </Space>
      )
    },
    {
      title: '創建時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (_: any, record: Project) => {
        const anyRecord = record as any;
        const ts = anyRecord.createdAt || anyRecord.created_at || anyRecord.created || anyRecord.createdDate;
        if (!ts) return '-';
        const d = new Date(ts);
        return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('zh-TW');
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: Project) => (
        <Space>
          <Tooltip title="查看任務">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/projects/${record.id}/tasks`)}
            />
          </Tooltip>
          {canCreateProjects && (
            <>
              <Upload
                multiple
                disabled={uploading}
                beforeUpload={() => false}
                showUploadList={false}
                onChange={async (info) => {
                  const files = info.fileList.map(f => f.originFileObj as File).filter(Boolean);
                  if (!files.length) return;
                  setUploading(true);
                  setBulkTargetProjectId(record.id);
                  try {
                    const resps: FileUploadResponse[] = await uploadProjectFiles(record.id, files);
                    message.success(`已上傳 ${resps.length} 個文件`);
                  } catch (e: any) {
                    message.error(e?.message || '批量上傳失敗');
                  } finally {
                    setUploading(false);
                    setBulkTargetProjectId(null);
                  }
                }}
              >
                <Tooltip title="批量上傳點雲">
                  <Button type="text" loading={uploading && bulkTargetProjectId===record.id}>
                    上傳
                  </Button>
                </Tooltip>
              </Upload>

              <Upload
                accept=".zip"
                disabled={uploading}
                beforeUpload={() => false}
                showUploadList={false}
                onChange={async (info) => {
                  const zip = info.file.originFileObj as File;
                  if (!zip) return;
                  setUploading(true);
                  setBulkTargetProjectId(record.id);
                  try {
                    const resps = await uploadProjectArchive(record.id, zip);
                    message.success(`ZIP 解析成功，上傳 ${resps.length} 個文件`);
                  } catch (e: any) {
                    message.error(e?.message || 'ZIP 上傳失敗');
                  } finally {
                    setUploading(false);
                    setBulkTargetProjectId(null);
                  }
                }}
              >
                <Tooltip title="上傳ZIP (含多個NPY/NPZ)">
                  <Button type="text" loading={uploading && bulkTargetProjectId===record.id}>
                    上傳ZIP
                  </Button>
                </Tooltip>
              </Upload>
            </>
          )}
          
          {canCreateProjects && (
            <>
              <Tooltip title="編輯專案">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openModal(record)}
                />
              </Tooltip>
              
              <Tooltip title="專案設置">
                <Button
                  type="text"
                  icon={<SettingOutlined />}
                  onClick={() => {
                    message.info('專案設置功能開發中...');
                  }}
                />
              </Tooltip>
              
              <Popconfirm
                title="確定要删除這個專案嗎？"
                description="删除後無法恢復，請謹慎操作。"
                onConfirm={() => handleDelete(record.id)}
                okText="删除"
                cancelText="取消"
                okType="danger"
              >
                <Tooltip title="删除專案">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
              {isSystemAdmin && (
                <Tooltip title="指派管理員">
                  <Button type="text" onClick={() => openAssignAdmin(record.id)}>
                    指派管理員
                  </Button>
                </Tooltip>
              )}
            </>
          )}
        </Space>
      )
    }
  ];

  // Calculate statistics
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const totalTasks = projects.reduce((sum, p) => sum + p.taskCount, 0);
  const averageProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
    : 0;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      
      <Content style={{ padding: '24px', paddingTop: '88px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                <FileTextOutlined style={{ marginRight: '12px' }} />
                專案管理
              </Title>
              <Text type="secondary">管理和監控所有點雲標注專案</Text>
            </Col>
            <Col>
              {canCreateProjects && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openModal()}
                  size="large"
                >
                  創建專案
                </Button>
              )}
              {/* Debug: canCreateProjects = {String(canCreateProjects)}, user role = {user?.globalRole} */}
            </Col>
          </Row>

          {/* Statistics */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="總專案數"
                  value={projects.length}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="進行中專案"
                  value={activeProjects}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="總任務數"
                  value={totalTasks}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="平均進度"
                  value={averageProgress}
                  suffix="%"
                  prefix={<Progress type="circle" percent={averageProgress} size={20} />}
                />
              </Card>
            </Col>
          </Row>

          {/* Projects Table */}
          <Card>
            <Table
              columns={columns}
              dataSource={projects}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 項，共 ${total} 項`
              }}
              scroll={{ x: 1000 }}
            />
          </Card>

          {/* Create/Edit Modal */}
          <Modal
            title={editingProject ? '編輯專案' : '創建新專案'}
            open={isModalVisible}
            onCancel={() => {
              setIsModalVisible(false);
              setEditingProject(null);
              form.resetFields();
            }}
            footer={null}
            width={600}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              requiredMark={false}
            >
              <Form.Item
                label="專案名稱"
                name="name"
                rules={[
                  { required: true, message: '請輸入專案名稱' },
                  { min: 2, message: '專案名稱至少需要2個字符' }
                ]}
              >
                <Input placeholder="請輸入專案名稱" />
              </Form.Item>

              <Form.Item
                label="專案描述"
                name="description"
                rules={[
                  { required: true, message: '請輸入專案描述' },
                  { min: 10, message: '專案描述至少需要10個字符' }
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="請詳細描述專案目標、範圍和要求..."
                />
              </Form.Item>

              <Form.Item
                label="專案狀態"
                name="status"
                initialValue="active"
              >
                <Select>
                  <Option value="active">進行中</Option>
                  <Option value="paused">暫停</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="archived">已歸檔</Option>
                </Select>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setIsModalVisible(false)}>
                    取消
                  </Button>
                  <Button type="primary" htmlType="submit">
                    {editingProject ? '更新' : '創建'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* Assign Admin Modal */}
          <Modal
            title="指派專案管理員"
            open={assignAdminOpen.open}
            onCancel={() => setAssignAdminOpen({ open: false })}
            onOk={doAssignAdmin}
            okText="指派"
          >
            <Form layout="vertical">
              <Form.Item label="選擇使用者">
                <Select
                  showSearch
                  placeholder="搜尋使用者"
                  options={userOptions}
                  value={assignUserId}
                  onChange={setAssignUserId as any}
                  optionFilterProp="label"
                />
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </Content>
    </Layout>
  );
};

export default ProjectManagement; 