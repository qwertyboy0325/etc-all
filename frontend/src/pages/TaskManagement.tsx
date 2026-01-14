import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Input, 
  Select, 
  App, 
  Spin,
  Statistic,
  Tabs
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined as Filter,
  ReloadOutlined
} from '@ant-design/icons';
// import { useAuth } from '../contexts/AuthContext';
import PageLayout from '../components/common/PageLayout';
import TaskBoard from '../components/TaskBoard';
import TaskCreateModal, { TaskFormData } from '../components/TaskCreateModal';
import TaskList from '../components/TaskList';
import ProjectFiles from '../components/ProjectFiles';
import { apiCall, API_BASE_URL, getAuthHeaders } from '../utils/api';
// import TaskStatsCard from '../components/TaskStatsCard';
import { 
  Task, TaskStatus, TaskFilter, TaskStats,
  TASK_STATUS_LABELS, TASK_PRIORITY_LABELS 
} from '../types/task';
import { type FileInfo } from '../services/fileService';
import { usePermissions } from '../contexts/AuthContext';

const { Title } = Typography;
const { Option } = Select;

interface TaskManagementProps {}

const TaskManagement: React.FC<TaskManagementProps> = () => {
  const { message } = App.useApp();
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
  const [availableFiles, setAvailableFiles] = useState<FileInfo[]>([]);
  const [projectTags, setProjectTags] = useState<any[]>([]);
  const { isAdmin, isSystemAdmin } = usePermissions();
  const canDelete = isAdmin || isSystemAdmin;
  const canManageProject = isAdmin || isSystemAdmin;
  
  const [activeTab, setActiveTab] = useState('tasks');

  // Effects
  useEffect(() => {
    if (projectId && activeTab === 'tasks') {
      loadTasks();
      loadStats();
      loadProjectTags();
      refreshProjectFiles(); // Pre-load for modal
    }
  }, [projectId, filters, pagination.current, searchTerm, activeTab]);

  const loadProjectTags = async () => {
    if (!projectId) return;
    try {
      const data = await apiCall(`/projects/${projectId}/vehicle-types`);
      setProjectTags(data || []);
    } catch (error) {
      console.error('Load tags error:', error);
    }
  };

  const refreshProjectFiles = async () => {
    try {
      if (!projectId) return;
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/files?page=1&size=100`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAvailableFiles(data.items || data || []);
      } else {
        setAvailableFiles([]);
      }
    } catch {
      setAvailableFiles([]);
    }
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

      const data = await apiCall(`/projects/${projectId}/tasks?${params}`);

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

  const loadStats = async () => {
    if (!projectId) return;
    try {
      const data = await apiCall(`/projects/${projectId}/tasks/stats`);
      setStats(data);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const handleCreateTask = async (taskData: TaskFormData) => {
    if (!projectId) return;
    setLoading(true);
    try {
      const fileIds = taskData.pointcloudFileIds || (taskData.pointcloudFileId ? [taskData.pointcloudFileId] : []);
        
      if (fileIds.length === 0) {
          message.error('未選擇檔案');
          return;
      }

      // Always use batch endpoint as it handles multiple files and assignments
      await apiCall(`/projects/${projectId}/tasks/batch`, {
        method: 'POST',
        body: JSON.stringify({
          file_ids: fileIds,
          name_prefix: taskData.name,
          priority: taskData.priority,
          max_annotations: taskData.maxAnnotations ?? 3,
          require_review: taskData.requireReview ?? true,
          due_date: taskData.dueDate,
          instructions: taskData.instructions,
          assignee_ids: taskData.assigneeIds,
          distribute_equally: taskData.distributeEqually
        })
      });
      
      message.success(`成功創建任務`);

      setIsCreateModalVisible(false);
      await loadTasks();
      await loadStats();
    } catch (error: any) {
      console.error('Create task error:', error);
      message.error(error.message || '創建任務失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async (taskId: string, assigneeId: string) => {
    if (!projectId) return;
    try {
      await apiCall(`/projects/${projectId}/tasks/${taskId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignee_id: assigneeId })
      });
        message.success('任務分配成功');
        loadTasks();
        loadStats();
    } catch (error) {
      console.error('Assign task error:', error);
      message.error('分配任務時發生錯誤');
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    if (!projectId) return;
    try {
      await apiCall(`/projects/${projectId}/tasks/${taskId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
        message.success('任務狀態更新成功');
        loadTasks();
        loadStats();
    } catch (error) {
      console.error('Update status error:', error);
      message.error('更新任務狀態時發生錯誤');
    }
  };

  const resetFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  if (!projectId) {
    return (
      <PageLayout title="任務管理">
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Title level={3}>請選擇一個專案來查看任務</Title>
          </div>
      </PageLayout>
    );
  }

  const tasksContent = (
    <div style={{ width: '100%', padding: '0 16px' }}>
      {/* Actions */}
      <Row justify="end" style={{ marginBottom: '16px' }}>
        <Col>
          <Space>
            {canManageProject && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalVisible(true)}
              >
                創建任務
              </Button>
            )}
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
              <Space.Compact>
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
              </Space.Compact>
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
                window.open(`/projects/${projectId}/tasks/${task.id}/annotate`, '_blank');
              }}
              onEdit={canManageProject ? (task) => {
                message.info(`編輯任務: ${task.name}`);
              } : undefined}
              onDelete={canDelete ? async (taskId) => {
                try {
                  await apiCall(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
                  message.success('任務已刪除');
                  loadTasks();
                  loadStats();
                } catch (e: any) {
                  message.error(e?.message || '刪除任務失敗');
                }
              } : undefined}
            />
          </Card>
        ) : (
           <TaskBoard
             tasks={tasks}
             onAssign={canManageProject ? handleAssignTask : undefined}
             onStatusChange={handleStatusChange}
             projectId={projectId}
             onView={(task) => {
               window.open(`/projects/${projectId}/tasks/${task.id}/annotate`, '_blank');
             }}
             onDelete={canDelete ? async (taskId) => {
               try {
                 await apiCall(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
                 message.success('任務已刪除');
                 loadTasks();
                 loadStats();
               } catch (e: any) {
                 message.error(e?.message || '刪除任務失敗');
               }
             } : undefined}
           />
        )}
      </Spin>

      <TaskCreateModal
        visible={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        onSubmit={handleCreateTask}
        loading={loading}
        projectId={projectId || ''}
        availableFiles={availableFiles}
        onRefreshFiles={refreshProjectFiles}
        projectTags={projectTags}
      />
    </div>
  );

  const tabItems = [
    {
      key: 'tasks',
      label: '任務看板 (Tasks)',
      children: tasksContent
    },
    {
      key: 'files',
      label: '檔案資源庫 (Assets)',
      children: <div style={{ maxWidth: '1400px', margin: '0 auto' }}><ProjectFiles projectId={projectId} /></div>
    }
  ];

  if (canManageProject) {
    tabItems.push({
      key: 'settings',
      label: '專案設定 (Settings)',
      children: <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 24 }}>專案設定開發中...</div>
    });
  }

  return (
    <PageLayout 
      title="任務管理"
      subtitle="管理和分配點雲標注任務"
      breadcrumbs={[
        { title: '首頁', href: '/' },
        { title: '專案管理', href: '/projects' },
        { title: '任務管理' }
      ]}
    >
      <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
          type="line"
          items={tabItems}
        />
      </div>
    </PageLayout>
  );
};

export default TaskManagement;
