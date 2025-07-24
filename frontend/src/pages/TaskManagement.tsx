import React, { useState, useEffect } from 'react';
import { 
  Layout, Typography, Card, Button, Select, Space, message, Spin, 
  Input, Row, Col, Statistic, Badge, Tag
} from 'antd';
import {
  Plus, Filter, Users, Clock, CheckCircle, 
  AlertTriangle, FileText
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import TaskBoard from '../components/TaskBoard';
// import TaskList from '../components/TaskList';
// import TaskCreateModal from '../components/TaskCreateModal';
// import TaskStatsCard from '../components/TaskStatsCard';
import { 
  Task, TaskFilter, TaskStats, TaskStatus, TaskPriority,
  TASK_STATUS_LABELS, TASK_PRIORITY_LABELS 
} from '../types/task';

const { Title } = Typography;
const { Content } = Layout;
const { Option } = Select;
const { Search: SearchInput } = Input;

interface TaskManagementProps {
  projectId?: string;
}

const TaskManagement: React.FC<TaskManagementProps> = () => {
  const { projectId } = useParams<{ projectId: string }>();
  
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

      const response = await fetch(`/api/v1/projects/${projectId}/tasks?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.items);
        setPagination(prev => ({
          ...prev,
          total: data.total
        }));
      } else {
        message.error('載入任務失敗');
      }
    } catch (error) {
      console.error('Load tasks error:', error);
      message.error('載入任務時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/tasks/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const handleCreateTask = async (_taskData: any) => {
    // TODO: Implement task creation modal
    message.info('任務創建功能開發中...');
    setIsCreateModalVisible(false);
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

  const handleAutoAssign = async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/tasks/auto-assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          message.success('自動分配成功');
          loadTasks();
          loadStats();
        } else {
          message.info('目前沒有可分配的任務');
        }
      } else {
        const error = await response.json();
        message.error(error.detail || '自動分配失敗');
      }
    } catch (error) {
      console.error('Auto assign error:', error);
      message.error('自動分配時發生錯誤');
    }
  };

  const resetFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePaginationChange = (_page: number, _pageSize?: number) => {
    // TODO: Implement pagination for list view
    message.info('分頁功能將在列表視圖中實現');
  };

  if (!projectId) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>請選擇一個專案來查看任務</Title>
      </div>
    );
  }

  return (
    <Layout style={{ background: '#f5f5f5' }}>
      <Content style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                <FileText size={28} style={{ marginRight: '12px' }} />
                任務管理
              </Title>
            </Col>
            <Col>
              <Space>
                <Button 
                  icon={<Users />} 
                  onClick={handleAutoAssign}
                >
                  自動分配任務
                </Button>
                <Button 
                  type="primary" 
                  icon={<Plus />}
                  onClick={() => setIsCreateModalVisible(true)}
                >
                  創建任務
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="總任務"
                  value={stats.total_tasks}
                  prefix={<FileText size={20} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="進行中"
                  value={stats.in_progress_tasks}
                  prefix={<Clock size={20} />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="已完成"
                  value={stats.completed_tasks}
                  prefix={<CheckCircle size={20} />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="逾期任務"
                  value={stats.overdue_tasks}
                  prefix={<AlertTriangle size={20} />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Filters and Controls */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={8} md={6}>
              <SearchInput
                placeholder="搜尋任務名稱"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={loadTasks}
                allowClear
              />
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Select
                placeholder="狀態"
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                allowClear
                style={{ width: '100%' }}
              >
                {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                  <Option key={key} value={key}>
                    <Badge 
                      color={key === TaskStatus.PENDING ? 'default' : 
                             key === TaskStatus.ASSIGNED ? 'orange' :
                             key === TaskStatus.IN_PROGRESS ? 'blue' :
                             key === TaskStatus.COMPLETED ? 'green' : 'red'} 
                    />
                    {label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Select
                placeholder="優先級"
                value={filters.priority}
                onChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                allowClear
                style={{ width: '100%' }}
              >
                {Object.entries(TASK_PRIORITY_LABELS).map(([key, label]) => (
                  <Option key={key} value={key}>
                    <Tag color={
                      key === TaskPriority.LOW ? 'green' :
                      key === TaskPriority.MEDIUM ? 'orange' :
                      key === TaskPriority.HIGH ? 'red' : 'magenta'
                    }>
                      {label}
                    </Tag>
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Button 
                icon={<Filter />}
                onClick={() => setFilters(prev => ({ ...prev, overdue_only: !prev.overdue_only }))}
                type={filters.overdue_only ? 'primary' : 'default'}
              >
                只顯示逾期
              </Button>
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Button onClick={resetFilters}>重置篩選</Button>
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
            <Card>
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Title level={4}>📋 列表視圖開發中</Title>
                <p>找到 {tasks.length} 個任務</p>
                <Button type="primary" onClick={loadTasks}>重新載入</Button>
              </div>
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

        {/* Placeholder for Create Modal */}
        {isCreateModalVisible && (
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <Card style={{ width: 400 }}>
              <Title level={4}>創建任務</Title>
              <p>任務創建功能開發中...</p>
              <Button onClick={() => setIsCreateModalVisible(false)}>關閉</Button>
            </Card>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default TaskManagement; 