import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  List,
  Button,
  Space,
  Tag,
  Typography,
  Badge,
  Empty,
  Modal,
  Form,
  Input,
  Select,
  message,
  Row,
  Col,
  Statistic,
  Divider,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  BellOutlined,
  DeleteOutlined,
  ReadOutlined,
  SettingOutlined,
  FilterOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { apiCall } from '../utils/api';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  data: any;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

interface NotificationStats {
  total_notifications: number;
  unread_notifications: number;
  type_breakdown: Record<string, number>;
  recent_notifications: number;
}

const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total_notifications: 0,
    unread_notifications: 0,
    type_breakdown: {},
    recent_notifications: 0,
  });
  const [filter, setFilter] = useState({
    type: 'all',
    status: 'all',
  });
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  // 載入通知列表
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.type !== 'all') params.append('type', filter.type);
      if (filter.status !== 'all') params.append('unread_only', filter.status === 'unread' ? 'true' : 'false');

      const response = await apiCall(`/notifications/?${params.toString()}`, {
        method: 'GET',
      });
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      message.error('載入通知失敗');
    } finally {
      setLoading(false);
    }
  };

  // 載入通知統計
  const loadNotificationStats = async () => {
    try {
      const response = await apiCall('/notifications/stats', {
        method: 'GET',
      });
      setStats(response.data || stats);
    } catch (error) {
      console.error('Failed to load notification stats:', error);
    }
  };

  // 標記為已讀
  const markAsRead = async (notificationId: string) => {
    try {
      await apiCall(`/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      
      loadNotificationStats();
    } catch (error) {
      console.error('Failed to mark as read:', error);
      message.error('標記失敗');
    }
  };

  // 標記所有為已讀
  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await apiCall('/notifications/read-all', {
        method: 'PUT',
      });
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true, read_at: new Date().toISOString() }))
      );
      
      loadNotificationStats();
      message.success('所有通知已標記為已讀');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      message.error('標記失敗');
    } finally {
      setLoading(false);
    }
  };

  // 刪除通知
  const deleteNotification = async (notificationId: string) => {
    try {
      await apiCall(`/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      loadNotificationStats();
      message.success('通知已刪除');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      message.error('刪除失敗');
    }
  };

  // 批量刪除
  const batchDelete = async () => {
    try {
      setLoading(true);
      const deletePromises = selectedNotifications.map(id => 
        apiCall(`/notifications/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      
      setNotifications(prev => 
        prev.filter(notif => !selectedNotifications.includes(notif.id))
      );
      setSelectedNotifications([]);
      loadNotificationStats();
      message.success(`已刪除 ${selectedNotifications.length} 條通知`);
    } catch (error) {
      console.error('Failed to batch delete:', error);
      message.error('批量刪除失敗');
    } finally {
      setLoading(false);
    }
  };

  // 獲取通知圖標
  const getNotificationIcon = (type: string, priority: string) => {
    const iconStyle = { fontSize: '16px' };
    
    if (priority === 'urgent') {
      return <ExclamationCircleOutlined style={{ ...iconStyle, color: '#ff4d4f' }} />;
    }
    
    switch (type) {
      case 'review_needed':
        return <ExclamationCircleOutlined style={{ ...iconStyle, color: '#fa8c16' }} />;
      case 'annotation_approved':
        return <CheckCircleOutlined style={{ ...iconStyle, color: '#52c41a' }} />;
      case 'annotation_rejected':
        return <ExclamationCircleOutlined style={{ ...iconStyle, color: '#ff4d4f' }} />;
      case 'task_assigned':
        return <InfoCircleOutlined style={{ ...iconStyle, color: '#1890ff' }} />;
      case 'system':
        return <SettingOutlined style={{ ...iconStyle, color: '#722ed1' }} />;
      default:
        return <BellOutlined style={{ ...iconStyle, color: '#8c8c8c' }} />;
    }
  };

  // 獲取優先級標籤
  const getPriorityTag = (priority: string) => {
    const priorityConfig = {
      low: { color: 'default', text: '低' },
      normal: { color: 'blue', text: '普通' },
      high: { color: 'orange', text: '高' },
      urgent: { color: 'red', text: '緊急' },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 過濾通知
  const filteredNotifications = notifications.filter(notif => {
    if (filter.type !== 'all' && notif.type !== filter.type) return false;
    if (filter.status === 'unread' && notif.is_read) return false;
    if (filter.status === 'read' && !notif.is_read) return false;
    return true;
  });

  useEffect(() => {
    loadNotifications();
    loadNotificationStats();
  }, [filter]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navbar title="通知中心" />
      <Content style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2}>通知中心</Title>
          <Text type="secondary">管理您的系統通知</Text>
        </div>

        {/* 統計卡片 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="總通知數"
                value={stats.total_notifications}
                prefix={<BellOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="未讀通知"
                value={stats.unread_notifications}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="最近7天"
                value={stats.recent_notifications}
                prefix={<InfoCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已讀率"
                value={stats.total_notifications > 0 ? 
                  Math.round(((stats.total_notifications - stats.unread_notifications) / stats.total_notifications) * 100) : 0
                }
                suffix="%"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 通知列表 */}
        <Card
          title="通知列表"
          extra={
            <Space>
              <Select
                value={filter.type}
                onChange={(value) => setFilter(prev => ({ ...prev, type: value }))}
                style={{ width: 120 }}
              >
                <Option value="all">所有類型</Option>
                <Option value="review_needed">審核通知</Option>
                <Option value="annotation_approved">標注通過</Option>
                <Option value="annotation_rejected">標注拒絕</Option>
                <Option value="task_assigned">任務分配</Option>
                <Option value="system">系統通知</Option>
              </Select>
              
              <Select
                value={filter.status}
                onChange={(value) => setFilter(prev => ({ ...prev, status: value }))}
                style={{ width: 100 }}
              >
                <Option value="all">全部</Option>
                <Option value="unread">未讀</Option>
                <Option value="read">已讀</Option>
              </Select>
              
              <Button
                icon={<ReloadOutlined />}
                onClick={loadNotifications}
                loading={loading}
              >
                刷新
              </Button>
              
              <Button
                type="primary"
                icon={<ReadOutlined />}
                onClick={markAllAsRead}
                loading={loading}
                disabled={stats.unread_notifications === 0}
              >
                全部已讀
              </Button>
              
              {selectedNotifications.length > 0 && (
                <Popconfirm
                  title="確定要刪除選中的通知嗎？"
                  onConfirm={batchDelete}
                  okText="確定"
                  cancelText="取消"
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={loading}
                  >
                    批量刪除 ({selectedNotifications.length})
                  </Button>
                </Popconfirm>
              )}
            </Space>
          }
        >
          {filteredNotifications.length === 0 ? (
            <Empty
              description="暫無通知"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              dataSource={filteredNotifications}
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 條通知`,
              }}
              renderItem={(notification) => (
                <List.Item
                  key={notification.id}
                  style={{
                    backgroundColor: notification.is_read ? '#fff' : '#f6ffed',
                    borderLeft: notification.is_read ? 'none' : '3px solid #52c41a',
                    padding: '16px',
                    marginBottom: '8px',
                    borderRadius: '6px',
                  }}
                  actions={[
                    <Space key="actions">
                      {!notification.is_read && (
                        <Button
                          type="link"
                          size="small"
                          icon={<ReadOutlined />}
                          onClick={() => markAsRead(notification.id)}
                        >
                          標記已讀
                        </Button>
                      )}
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => deleteNotification(notification.id)}
                      >
                        刪除
                      </Button>
                    </Space>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot={!notification.is_read}>
                        {getNotificationIcon(notification.type, notification.priority)}
                      </Badge>
                    }
                    title={
                      <Space>
                        <Text strong={!notification.is_read}>
                          {notification.title}
                        </Text>
                        {getPriorityTag(notification.priority)}
                        {!notification.is_read && (
                          <Tag color="green" size="small">未讀</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <Paragraph
                          ellipsis={{ rows: 2, expandable: true, symbol: '展開' }}
                          style={{ marginBottom: '8px' }}
                        >
                          {notification.content}
                        </Paragraph>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {new Date(notification.created_at).toLocaleString()}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Content>
    </Layout>
  );
};

export default NotificationCenter;
