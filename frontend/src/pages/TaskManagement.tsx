import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Layout,
  Card, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Input, 
  Select, 
  message, 
  Spin,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined as Filter,
  ReloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import TaskBoard from '../components/TaskBoard';
import TaskCreateModal, { TaskFormData } from '../components/TaskCreateModal';
import TaskList from '../components/TaskList';
import { smartApiCall } from '../utils/api';
// import TaskStatsCard from '../components/TaskStatsCard';
import { 
  Task, TaskStatus, TaskPriority, TaskFilter, TaskStats,
  TASK_STATUS_LABELS, TASK_PRIORITY_LABELS 
} from '../types/task';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

interface TaskManagementProps {}

const TaskManagement: React.FC<TaskManagementProps> = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<TaskFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // Effects
  useEffect(() => {
    if (projectId) {
      loadTasks();
      loadStats();
    }
  }, [projectId, filters, pagination.current, searchTerm]);

  // Mock data generation function
  const getMockTasks = (): Task[] => {
    const mockTasks: Task[] = [
      {
        id: '1',
        project_id: projectId || '1',
        name: '城市道路車輛檢測',
        description: '標注城市道路中的各種車輛類型，包括轎車、貨車、摩托車等',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        max_annotations: 1,
        require_review: true,
        due_date: '2024-02-15',
        assigned_to: '2',
        created_by: user?.id || '1',
        pointcloud_file_id: 'file_1',
        pointcloud_file: {
          id: 'file_1',
          original_filename: 'city_road_001.npy',
          file_size: 25600000,
          point_count: 128000
        },
        assignee: {
          id: '2',
          full_name: '張小明',
          email: 'zhang@etc.com'
        },
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-01-25T00:00:00Z',
        is_overdue: false,
        is_completed: false,
        annotation_count: 1,
        completion_rate: 65
      },
      {
        id: '2',
        project_id: projectId || '1',
        name: '高速公路車輛識別',
        description: '高速公路場景下的車輛檢測和分類',
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.MEDIUM,
        max_annotations: 1,
        require_review: false,
        due_date: '2024-01-30',
        assigned_to: '3',
        created_by: user?.id || '1',
        pointcloud_file_id: 'file_2',
        pointcloud_file: {
          id: 'file_2',
          original_filename: 'highway_001.npz',
          file_size: 18400000,
          point_count: 92000
        },
        assignee: {
          id: '3',
          full_name: '李小華',
          email: 'li@etc.com'
        },
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-28T00:00:00Z',
        is_overdue: false,
        is_completed: true,
        annotation_count: 1,
        completion_rate: 100
      },
      {
        id: '3',
        project_id: projectId || '1',
        name: '停車場車輛分類',
        description: '停車場環境中靜態車輛的類型標注',
        status: TaskStatus.PENDING,
        priority: TaskPriority.LOW,
        max_annotations: 1,
        require_review: true,
        due_date: '2024-02-20',
        created_by: user?.id || '1',
        pointcloud_file_id: 'file_3',
        pointcloud_file: {
          id: 'file_3',
          original_filename: 'parking_lot_001.ply',
          file_size: 32100000,
          point_count: 160000
        },
        created_at: '2024-01-22T00:00:00Z',
        updated_at: '2024-01-22T00:00:00Z',
        is_overdue: false,
        is_completed: false,
        annotation_count: 0,
        completion_rate: 0
      },
      {
        id: '4',
        project_id: projectId || '1',
        name: '交叉路口車輛追蹤',
        description: '複雜交叉路口場景下的車輛檢測與追蹤',
        status: TaskStatus.ASSIGNED,
        priority: TaskPriority.URGENT,
        max_annotations: 2,
        require_review: true,
        due_date: '2024-02-10',
        assigned_to: '4',
        created_by: user?.id || '1',
        pointcloud_file_id: 'file_4',
        pointcloud_file: {
          id: 'file_4',
          original_filename: 'intersection_001.npy',
          file_size: 45200000,
          point_count: 226000
        },
        assignee: {
          id: '4',
          full_name: '王小紅',
          email: 'wang@etc.com'
        },
        created_at: '2024-01-25T00:00:00Z',
        updated_at: '2024-01-26T00:00:00Z',
        is_overdue: true,
        is_completed: false,
        annotation_count: 0,
        completion_rate: 15
      }
    ];

    // Filter tasks based on current filters
    let filteredTasks = mockTasks;
    
    if (filters.status) {
      filteredTasks = filteredTasks.filter(task => task.status === filters.status);
    }
    
    if (filters.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
    }
    
    if (filters.assigned_to) {
      filteredTasks = filteredTasks.filter(task => task.assigned_to === filters.assigned_to);
    }
    
    if (searchTerm) {
      filteredTasks = filteredTasks.filter(task => 
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filters.overdue_only) {
      filteredTasks = filteredTasks.filter(task => task.is_overdue);
    }

    return filteredTasks;
  };

  // API functions
  const loadTasks = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        size: pagination.pageSize.toString(),
        ...(filters.status && { status_filter: filters.status }),
        ...(filters.priority && { priority_filter: filters.priority }),
        ...(filters.assigned_to && { assigned_to: filters.assigned_to }),
        ...(filters.created_by && { created_by: filters.created_by }),
        ...(searchTerm && { name_search: searchTerm }),
        ...(filters.overdue_only && { overdue_only: 'true' })
      });

      // Use smart API call with mock fallback
      const data = await smartApiCall(
        `/projects/${projectId}/tasks?${params}`,
        {},
        () => {
          const mockData = getMockTasks();
          return { items: mockData, total: mockData.length };
        }
      );

      setTasks(data.items || data);
      setPagination(prev => ({
        ...prev,
        total: data.total || (Array.isArray(data) ? data.length : data.items?.length || 0)
      }));

    } catch (error) {
      console.error('Load tasks error:', error);
      message.error('載入任務時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  // Mock stats generation function
  const getMockStats = (): TaskStats => {
    return {
      total_tasks: tasks.length,
      pending_tasks: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      assigned_tasks: tasks.filter(t => t.status === TaskStatus.ASSIGNED).length,
      in_progress_tasks: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed_tasks: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      overdue_tasks: tasks.filter(t => t.is_overdue).length,
      completion_rate: tasks.length > 0 
        ? Math.round(tasks.reduce((sum, t) => sum + t.completion_rate, 0) / tasks.length)
        : 0,
      status_breakdown: {
        [TaskStatus.PENDING]: tasks.filter(t => t.status === TaskStatus.PENDING).length,
        [TaskStatus.ASSIGNED]: tasks.filter(t => t.status === TaskStatus.ASSIGNED).length,
        [TaskStatus.IN_PROGRESS]: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
        [TaskStatus.COMPLETED]: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
        [TaskStatus.REVIEWED]: tasks.filter(t => t.status === TaskStatus.REVIEWED).length,
        [TaskStatus.REJECTED]: tasks.filter(t => t.status === TaskStatus.REJECTED).length,
        [TaskStatus.CANCELLED]: tasks.filter(t => t.status === TaskStatus.CANCELLED).length,
      }
    };
  };

  const loadStats = async () => {
    if (!projectId) return;
    
    try {
      // Use smart API call with mock fallback
      const data = await smartApiCall(
        `/projects/${projectId}/tasks/stats`,
        {},
        () => getMockStats()
      );
      
      setStats(data);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const handleCreateTask = async (taskData: TaskFormData) => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      // Mock API call - create task
      const newTask: Task = {
        id: Date.now().toString(),
        project_id: projectId,
        name: taskData.name,
        description: taskData.description,
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        max_annotations: 1,
        require_review: false,
        due_date: taskData.dueDate,
        assigned_to: taskData.assignedTo,
        created_by: user?.id || '1',
        pointcloud_file_id: Date.now().toString() + '_file',
        is_completed: false,
        annotation_count: 0,
        completion_rate: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_overdue: false
      };

      // Add to tasks list
      setTasks(prev => [newTask, ...prev]);
      
      message.success('任務創建成功！');
      setIsCreateModalVisible(false);
      
      // Reload stats
      loadStats();
    } catch (error) {
      console.error('Create task error:', error);
      message.error('創建任務失敗');
    } finally {
      setLoading(false);
    }
  };

  // Use the function in create button click
  const onCreateClick = () => {
    setIsCreateModalVisible(true);
  };

  const handleAssignTask = async (taskId: string, assigneeId: string) => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ assignee_id: assigneeId })
      });

      if (response.ok) {
        message.success('任務分配成功');
        loadTasks();
        loadStats();
      } else {
        const error = await response.json();
        message.error(error.detail || '分配任務失敗');
      }
    } catch (error) {
      console.error('Assign task error:', error);
      message.error('分配任務時發生錯誤');
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/tasks/${taskId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        message.success('任務狀態更新成功');
        loadTasks();
        loadStats();
      } else {
        const error = await response.json();
        message.error(error.detail || '更新任務狀態失敗');
      }
    } catch (error) {
      console.error('Update status error:', error);
      message.error('更新任務狀態時發生錯誤');
    }
  };

  // Removed handleAutoAssign function to avoid unused variable warning

  const resetFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePaginationChange = (_page: number, _pageSize?: number) => {
    // TODO: Implement pagination for list view
    message.info('分頁功能將在列表視圖中實現');
  };

  // This will be used when list view is implemented
  console.log('Pagination handler ready:', handlePaginationChange);

  if (!projectId) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Navbar />
        <Content style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Title level={3}>請選擇一個專案來查看任務</Title>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      
      <Content style={{ padding: '24px', paddingTop: '88px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
            <Col>
              <Title level={2} style={{ margin: 0 }}>任務管理</Title>
              <Typography.Text type="secondary">管理和分配點雲標注任務</Typography.Text>
            </Col>
            <Col>
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={onCreateClick}
                >
                  創建任務
                </Button>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={loadTasks}
                >
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>

          {/* Stats Cards */}
          {stats && (
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic title="總任務" value={stats.total_tasks} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic 
                    title="進行中" 
                    value={stats.in_progress_tasks} 
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic 
                    title="已完成" 
                    value={stats.completed_tasks} 
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic 
                    title="逾期" 
                    value={stats.overdue_tasks} 
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* Filters */}
          <Card style={{ marginBottom: '16px' }}>
            <Row gutter={16} align="middle">
              <Col xs={24} sm={8} md={6}>
                <Input
                  placeholder="搜索任務名稱..."
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={12} sm={4} md={3}>
                <Select
                  placeholder="狀態"
                  value={filters.status || undefined}
                  onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                    <Option key={key} value={key}>{label}</Option>
                  ))}
                </Select>
              </Col>
              <Col xs={12} sm={4} md={3}>
                <Select
                  placeholder="優先級"
                  value={filters.priority || undefined}
                  onChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {Object.entries(TASK_PRIORITY_LABELS).map(([key, label]) => (
                    <Option key={key} value={key}>{label}</Option>
                  ))}
                </Select>
              </Col>
              <Col xs={12} sm={4} md={3}>
                <Button 
                  icon={<Filter />}
                  onClick={resetFilters}
                >
                  重置
                </Button>
              </Col>
              <Col xs={24} sm={8} md={6}>
                <div style={{ textAlign: 'right' }}>
                  <Button.Group>
                    <Button 
                      type={viewMode === 'list' ? 'primary' : 'default'}
                      onClick={() => setViewMode('list')}
                    >
                      列表
                    </Button>
                    <Button 
                      type={viewMode === 'board' ? 'primary' : 'default'}
                      onClick={() => setViewMode('board')}
                    >
                      看板
                    </Button>
                  </Button.Group>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Task Content */}
          <Spin spinning={loading}>
            {viewMode === 'list' ? (
              <Card title={`📋 任務列表 (${tasks.length})`}>
                <TaskList
                  tasks={tasks}
                  loading={loading}
                  onView={(task) => {
                    // Navigate to annotation page
                    window.open(`/projects/${projectId}/tasks/${task.id}/annotate`, '_blank');
                  }}
                  onEdit={(task) => {
                    message.info(`編輯任務: ${task.name}`);
                  }}
                />
              </Card>
            ) : (
              <TaskBoard
                tasks={tasks}
                onAssign={handleAssignTask}
                onStatusChange={handleStatusChange}
                projectId={projectId}
              />
            )}
          </Spin>

          {/* Task Create Modal */}
          <TaskCreateModal
            visible={isCreateModalVisible}
            onCancel={() => setIsCreateModalVisible(false)}
            onSubmit={handleCreateTask}
            loading={loading}
            projectId={projectId || ''}
          />
        </div>
      </Content>
    </Layout>
  );
};

export default TaskManagement; 