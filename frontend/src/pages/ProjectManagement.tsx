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
  Tooltip
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
import { smartApiCall } from '../utils/api';
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
  const { canCreateProjects } = usePermissions();

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  // Load projects
  useEffect(() => {
    loadProjects();
  }, []);

  // Mock data generation function
  const getMockProjects = (): Project[] => {
    return [
      {
        id: '1',
        name: '城市車輛檢測專案',
        description: '針對城市交通場景的車輛類型檢測和標註，包含汽車、貨車、摩托車等多種車型',
        status: 'active',
        createdBy: user?.id || '1',
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-20T00:00:00Z',
        memberCount: 8,
        taskCount: 45,
        completedTasks: 32,
        progress: 71
      },
      {
        id: '2',
        name: '高速公路車輛識別',
        description: '高速公路場景下的車輛檢測，重點關注高速行駛車輛的準確識別',
        status: 'active',
        createdBy: user?.id || '1',
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-18T00:00:00Z',
        memberCount: 5,
        taskCount: 28,
        completedTasks: 28,
        progress: 100
      },
      {
        id: '3',
        name: '停車場車輛分類',
        description: '停車場環境中的靜態車輛分類，包含轎車、SUV、貨車等類型',
        status: 'paused',
        createdBy: user?.id || '1',
        createdAt: '2024-01-05T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
        memberCount: 3,
        taskCount: 15,
        completedTasks: 8,
        progress: 53
      }
    ];
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      // Use smart API call with mock fallback
      const data = await smartApiCall(
        '/projects',
        { method: 'GET' },
        () => getMockProjects()
      );

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

        const createdProject = await smartApiCall(
          '/projects',
          {
            method: 'POST',
            body: JSON.stringify(projectData)
          },
          () => {
            // Mock fallback - 只有在API調用失敗時才使用
            const mockProject: Project = {
              id: Date.now().toString(),
              ...values,
              createdBy: user?.id || '1',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              memberCount: 1,
              taskCount: 0,
              completedTasks: 0,
              progress: 0
            };
            return mockProject;
          }
        );

        // 處理API響應格式差異
        const newProject: Project = {
          id: (createdProject as any).id || Date.now().toString(),
          name: (createdProject as any).name,
          description: (createdProject as any).description || '',
          status: (createdProject as any).status || 'active',
          createdBy: (createdProject as any).created_by || user?.id || '1',
          createdAt: (createdProject as any).created_at || new Date().toISOString(),
          updatedAt: (createdProject as any).updated_at || new Date().toISOString(),
          memberCount: 1,
          taskCount: (createdProject as any).total_tasks || 0,
          completedTasks: (createdProject as any).completed_tasks || 0,
          progress: (createdProject as any).total_tasks > 0 
            ? Math.round(((createdProject as any).completed_tasks / (createdProject as any).total_tasks) * 100) 
            : 0
        };

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
      setProjects(prev => prev.filter(p => p.id !== projectId));
      message.success('專案删除成功');
    } catch (error) {
      console.error('Delete project error:', error);
      message.error('删除失敗');
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
      render: (date: string) => new Date(date).toLocaleDateString('zh-TW')
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
      
      <Content style={{ padding: '24px' }}>
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
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openModal()}
                size="large"
              >
                創建專案
              </Button>
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
        </div>
      </Content>
    </Layout>
  );
};

export default ProjectManagement; 