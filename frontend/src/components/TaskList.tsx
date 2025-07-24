import React from 'react';
import {
  Table,
  Tag,
  Space,
  Avatar,
  Button,
  Tooltip,
  Progress,
  Typography
} from 'antd';
import {
  EditOutlined,
  EyeOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { 
  Task, TaskStatus, TaskPriority,
  TASK_STATUS_LABELS, TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS
} from '../types/task';

const { Text } = Typography;

interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  onEdit?: (task: Task) => void;
  onView?: (task: Task) => void;
  onAssign?: (taskId: string, assigneeId: string) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  loading = false,
  onView,
  onEdit
}) => {
  const columns: ColumnsType<Task> = [
    {
      title: '任務名稱',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (text: string, record: Task) => (
        <div>
          <Text strong style={{ display: 'block' }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description && record.description.length > 60 
              ? `${record.description.substring(0, 60)}...`
              : record.description
            }
          </Text>
        </div>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: TaskStatus) => (
        <Tag color={TASK_STATUS_COLORS[status]}>
          {TASK_STATUS_LABELS[status]}
        </Tag>
      ),
      filters: Object.entries(TASK_STATUS_LABELS).map(([key, label]) => ({
        text: label,
        value: key
      })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '優先級',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: TaskPriority) => (
        <Tag color={TASK_PRIORITY_COLORS[priority]}>
          {TASK_PRIORITY_LABELS[priority]}
        </Tag>
      ),
      filters: Object.entries(TASK_PRIORITY_LABELS).map(([key, label]) => ({
        text: label,
        value: key
      })),
      onFilter: (value, record) => record.priority === value,
    },
    {
      title: '指派給',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 150,
      render: (assignee: any) => {
        if (assignee) {
          return (
            <Space>
              <Avatar 
                size="small" 
                style={{ backgroundColor: '#1890ff' }}
              >
                {assignee.full_name.charAt(0)}
              </Avatar>
              <div>
                <Text style={{ fontSize: '14px' }}>{assignee.full_name}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {assignee.email}
                </Text>
              </div>
            </Space>
          );
        }
        return (
          <Text type="secondary">
            <UserOutlined /> 未分配
          </Text>
        );
      },
    },
    {
      title: '進度',
      dataIndex: 'completion_rate',
      key: 'completion_rate',
      width: 120,
      render: (rate: number) => (
        <Progress 
          percent={rate} 
          size="small"
          strokeColor={rate >= 80 ? '#52c41a' : rate >= 50 ? '#fadb14' : '#1890ff'}
        />
      ),
      sorter: (a, b) => a.completion_rate - b.completion_rate,
    },
    {
      title: '截止日期',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (date: string, record: Task) => {
        if (!date) return <Text type="secondary">無</Text>;
        
        const dueDate = new Date(date);
        const now = new Date();
        const isOverdue = dueDate < now && !record.is_completed;
        
        return (
          <Space>
            <ClockCircleOutlined 
              style={{ color: isOverdue ? '#ff4d4f' : '#1890ff' }} 
            />
            <Text style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
              {dueDate.toLocaleDateString('zh-TW')}
            </Text>
            {isOverdue && <Tag color="red">逾期</Tag>}
          </Space>
        );
      },
      sorter: (a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      },
    },
    {
      title: '文件',
      dataIndex: 'pointcloud_file',
      key: 'pointcloud_file',
      width: 150,
      render: (file: any) => {
        if (!file) return <Text type="secondary">無</Text>;
        
        return (
          <Tooltip title={`${file.original_filename} (${(file.file_size / 1024 / 1024).toFixed(1)} MB)`}>
            <Space>
              <FileTextOutlined />
              <Text style={{ fontSize: '12px' }}>
                {file.original_filename.length > 15 
                  ? `${file.original_filename.substring(0, 15)}...`
                  : file.original_filename
                }
              </Text>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: '創建時間',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => (
        <Text style={{ fontSize: '12px' }}>
          {new Date(date).toLocaleDateString('zh-TW')}
        </Text>
      ),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record: Task) => (
        <Space size="small">
          <Tooltip title="查看詳情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onView?.(record)}
            />
          </Tooltip>
          <Tooltip title="編輯任務">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit?.(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={tasks}
      loading={loading}
      rowKey="id"
      size="small"
      scroll={{ x: 1200 }}
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => 
          `第 ${range[0]}-${range[1]} 項，共 ${total} 項任務`,
        pageSizeOptions: ['10', '20', '50', '100']
      }}
      rowClassName={(record) => {
        if (record.is_overdue && !record.is_completed) {
          return 'task-row-overdue';
        }
        if (record.status === TaskStatus.COMPLETED) {
          return 'task-row-completed';
        }
        return '';
      }}
    />
  );
};

export default TaskList; 