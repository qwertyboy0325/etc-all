// Task-related type definitions

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REVIEWED = 'reviewed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface User {
  id: string;
  full_name: string;
  email: string;
}

export interface PointCloudFile {
  id: string;
  original_filename: string;
  file_size: number;
  point_count: number | null;
}

export interface Task {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  max_annotations: number;
  require_review: boolean;
  due_date?: string;
  instructions?: string;
  
  // Assignment info
  assigned_to?: string;
  assigned_at?: string;
  created_by: string;
  
  // Point cloud file
  pointcloud_file_id: string;
  pointcloud_file?: PointCloudFile;
  
  // Completion info
  completed_at?: string;
  quality_score?: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Related users
  creator?: User;
  assignee?: User;
  
  // Computed properties
  is_overdue: boolean;
  is_completed: boolean;
  annotation_count: number;
  completion_rate: number;
}

export interface TaskCreate {
  name: string;
  description?: string;
  pointcloud_file_id: string;
  priority?: TaskPriority;
  max_annotations?: number;
  require_review?: boolean;
  due_date?: string;
  instructions?: string;
}

export interface TaskUpdate {
  name?: string;
  description?: string;
  priority?: TaskPriority;
  max_annotations?: number;
  require_review?: boolean;
  due_date?: string;
  instructions?: string;
}

export interface TaskAssignment {
  assignee_id: string;
}

export interface TaskStatusUpdate {
  status: TaskStatus;
}

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  created_by?: string;
  name?: string;
  overdue_only?: boolean;
}

export interface TaskListResponse {
  items: Task[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface TaskStats {
  total_tasks: number;
  pending_tasks: number;
  assigned_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  status_breakdown: Record<string, number>;
}

// UI-specific types
export interface TaskFormData {
  name: string;
  description: string;
  pointcloud_file_id: string;
  priority: TaskPriority;
  max_annotations: number;
  require_review: boolean;
  due_date?: Date;
  instructions: string;
}

export interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onAssign?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  showActions?: boolean;
}

export interface TaskBoardColumn {
  key: TaskStatus;
  title: string;
  tasks: Task[];
  color: string;
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '#d9d9d9',
  [TaskStatus.ASSIGNED]: '#fadb14',
  [TaskStatus.IN_PROGRESS]: '#1890ff',
  [TaskStatus.COMPLETED]: '#52c41a',
  [TaskStatus.REVIEWED]: '#00b96b',
  [TaskStatus.REJECTED]: '#ff4d4f',
  [TaskStatus.CANCELLED]: '#8c8c8c'
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: '#52c41a',
  [TaskPriority.MEDIUM]: '#fadb14',
  [TaskPriority.HIGH]: '#fa8c16',
  [TaskPriority.URGENT]: '#ff4d4f'
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '待分配',
  [TaskStatus.ASSIGNED]: '已分配',
  [TaskStatus.IN_PROGRESS]: '進行中',
  [TaskStatus.COMPLETED]: '已完成',
  [TaskStatus.REVIEWED]: '已審核',
  [TaskStatus.REJECTED]: '被拒絕',
  [TaskStatus.CANCELLED]: '已取消'
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: '低',
  [TaskPriority.MEDIUM]: '中',
  [TaskPriority.HIGH]: '高',
  [TaskPriority.URGENT]: '緊急'
}; 