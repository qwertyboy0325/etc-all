import React, { useMemo } from 'react';
import { Card, Tag, Avatar, Tooltip, Space, Typography, Badge, Button, Modal, Select, message } from 'antd';
import { Clock, User, AlertTriangle } from 'lucide-react';
import { 
  Task, TaskStatus, TaskBoardColumn,
  TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_COLORS
} from '../types/task';

const { Text, Title } = Typography;

interface TaskBoardProps {
  tasks: Task[];
  onAssign?: (taskId: string, assigneeId: string) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  projectId: string;
  onDelete?: (taskId: string) => void;
  onView?: (task: Task) => void;
}

interface TaskCardProps {
  task: Task;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
  onAssignClick?: (taskId: string) => void;
  onClick?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onDelete, onAssignClick, onClick }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  const isOverdue = task.is_overdue;
  const dueDate = task.due_date ? formatDate(task.due_date) : null;

  return (
    <Card 
      size="small" 
      style={{ 
        marginBottom: '8px',
        border: isOverdue ? '1px solid #ff4d4f' : undefined,
        boxShadow: isOverdue ? '0 2px 4px rgba(255, 77, 79, 0.2)' : undefined,
        cursor: onClick ? 'pointer' : 'default'
      }}
      bodyStyle={{ padding: '12px' }}
      onClick={onClick}
    >
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Title level={5} style={{ margin: 0, fontSize: '14px' }}>
            {task.name}
          </Title>
          <Tag 
            color={TASK_PRIORITY_COLORS[task.priority]} 
            style={{ fontSize: '10px', margin: 0 }}
          >
            {task.priority.toUpperCase()}
          </Tag>
        </div>
        
        {task.description && (
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
            {task.description.length > 50 
              ? `${task.description.substring(0, 50)}...` 
              : task.description
            }
          </Text>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size="small">
          {task.assignee ? (
            <Tooltip title={task.assignee.full_name}>
              <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                {task.assignee.full_name.charAt(0)}
              </Avatar>
            </Tooltip>
          ) : (
            <Tooltip title="未分配">
              <Avatar size="small" icon={<User size={12} />} style={{ backgroundColor: '#d9d9d9' }} />
            </Tooltip>
          )}
          
          {dueDate && (
            <Space size={2}>
              <Clock size={12} style={{ color: isOverdue ? '#ff4d4f' : '#999' }} />
              <Text style={{ 
                fontSize: '11px', 
                color: isOverdue ? '#ff4d4f' : '#999' 
              }}>
                {dueDate}
              </Text>
            </Space>
          )}
          
          {isOverdue && (
            <Tooltip title="任務逾期">
              <AlertTriangle size={12} style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
        </Space>

        <div>
          {task.files && task.files.length > 0 ? (
            <Tooltip title={task.files.map(f => f.original_filename).join(', ')}>
               <Tag icon={<AlertTriangle style={{ width: 12, height: 12 }} />} color="blue">
                  {task.files.length} 檔案
               </Tag>
            </Tooltip>
          ) : null}
        </div>
      </div>

      {task.completion_rate > 0 && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <Text style={{ fontSize: '11px', color: '#666' }}>進度</Text>
            <Text style={{ fontSize: '11px', color: '#666' }}>{task.completion_rate}%</Text>
          </div>
          <div style={{ 
            width: '100%', 
            height: '4px', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '2px' 
          }}>
            <div style={{ 
              width: `${task.completion_rate}%`, 
              height: '100%', 
              backgroundColor: '#52c41a', 
              borderRadius: '2px' 
            }} />
          </div>
        </div>
      )}

      {/* Actions */}
      {(onAssignClick || onDelete) && (
        <div 
          style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          {onAssignClick && !task.assigned_to && (
            <Tooltip title="指派給成員">
              <Button type="text" size="small" onClick={() => onAssignClick(task.id)}>
                指派
              </Button>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="刪除任務">
              <Button type="text" size="small" danger onClick={() => onDelete(task.id)}>
                刪除
              </Button>
            </Tooltip>
          )}
        </div>
      )}
    </Card>
  );
};

const TaskBoard: React.FC<TaskBoardProps> = ({ 
  tasks,
  onDelete,
  onAssign,
  projectId,
  onView
}) => {
  const [assignModal, setAssignModal] = React.useState<{ open: boolean; taskId?: string }>({ open: false });
  const [members, setMembers] = React.useState<{ label: string; value: string }[]>([]);
  const [assigneeId, setAssigneeId] = React.useState<string | undefined>();

  const openAssign = async (taskId: string) => {
    setAssignModal({ open: true, taskId });
    setAssigneeId(undefined);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/members`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
      if (!res.ok) throw new Error('成員載入失敗');
      const data = await res.json();
      const opts = (data?.items || []).map((m: any) => ({ label: m.user?.full_name || m.user?.email, value: m.user_id }));
      setMembers(opts);
    } catch (e: any) {
      message.error(e?.message || '載入專案成員失敗');
    }
  };

  const doAssign = async () => {
    if (!onAssign || !assignModal.taskId || !assigneeId) return;
    await onAssign(assignModal.taskId, assigneeId);
    setAssignModal({ open: false });
  };
  // Group tasks by status
  const columns: TaskBoardColumn[] = useMemo(() => {
    const groupedTasks = tasks.reduce((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    }, {} as Record<TaskStatus, Task[]>);

    return [
      {
        key: TaskStatus.PENDING,
        title: TASK_STATUS_LABELS[TaskStatus.PENDING],
        tasks: groupedTasks[TaskStatus.PENDING] || [],
        color: TASK_STATUS_COLORS[TaskStatus.PENDING]
      },
      {
        key: TaskStatus.ASSIGNED,
        title: TASK_STATUS_LABELS[TaskStatus.ASSIGNED],
        tasks: groupedTasks[TaskStatus.ASSIGNED] || [],
        color: TASK_STATUS_COLORS[TaskStatus.ASSIGNED]
      },
      {
        key: TaskStatus.IN_PROGRESS,
        title: TASK_STATUS_LABELS[TaskStatus.IN_PROGRESS],
        tasks: groupedTasks[TaskStatus.IN_PROGRESS] || [],
        color: TASK_STATUS_COLORS[TaskStatus.IN_PROGRESS]
      },
      {
        key: TaskStatus.COMPLETED,
        title: '待處理', // Override to be explicit
        tasks: groupedTasks[TaskStatus.COMPLETED] || [],
        color: 'orange' // Change color to orange for pending processing
      },
      {
        key: TaskStatus.REVIEWED,
        title: '已完成', // Merged Reviewed/Completed concept
        tasks: groupedTasks[TaskStatus.REVIEWED] || [],
        color: 'green'
      }
    ];
  }, [tasks]);

  const getTotalTasks = () => {
    return tasks.length;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ 
        display: 'flex', 
        gap: '16px',
        overflowX: 'auto',
        paddingBottom: '12px',
        minHeight: '400px',
        alignItems: 'stretch'
      }}>
      {columns.map((column) => (
        <div key={column.key} style={{ 
          flex: '0 0 320px', 
          width: '320px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: column.color
                  }} />
                  <span style={{ fontWeight: 600 }}>{column.title}</span>
                </Space>
                <Badge 
                  count={column.tasks.length} 
                  showZero 
                  style={{ backgroundColor: column.color, boxShadow: 'none' }}
                />
              </div>
            }
            size="small"
            bordered={false}
            style={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#f4f5f7',
              borderRadius: '12px'
            }}
            headStyle={{
                borderBottom: 'none',
                backgroundColor: 'transparent',
                padding: '12px 12px 0 12px',
                minHeight: 'auto'
            }}
            bodyStyle={{ 
              padding: '8px 8px 8px 8px',
              flex: 1,
              overflowY: 'auto'
            }}
          >
            <div style={{ minHeight: '100px' }}>
              {column.tasks.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px',
                  color: '#8c8c8c'
                }}>
                  <Text type="secondary" style={{ fontSize: '13px' }}>暫無任務</Text>
                </div>
              ) : (
                column.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDelete={onDelete}
                    onAssignClick={onAssign ? openAssign : undefined}
                    onClick={() => onView?.(task)}
                  />
                ))
              )}
            </div>
          </Card>
        </div>
      ))}
      </div>
      
      {/* Summary Card */}
      <Card
        title="📊 統計總覽"
        size="small"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
              {getTotalTasks()}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>總任務數</div>
          </div>
          {columns.map((column) => (
            <div key={column.key} style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: column.color 
              }}>
                {column.tasks.length}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {column.title}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        title="指派任務"
        open={assignModal.open}
        onCancel={() => setAssignModal({ open: false })}
        onOk={doAssign}
        okText="指派"
      >
        <Select
          placeholder="選擇成員"
          style={{ width: '100%' }}
          options={members}
          value={assigneeId}
          onChange={setAssigneeId as any}
          showSearch
          optionFilterProp="label"
        />
      </Modal>
    </div>
  );
};

export default TaskBoard; 