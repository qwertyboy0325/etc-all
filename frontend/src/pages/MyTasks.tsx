import React, { useEffect, useState } from 'react';
import { Layout, Card, Table, Tag, Space, Button, Typography, message } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import Navbar from '../components/Navbar';
import { apiCall } from '../utils/api';

const { Content } = Layout;
const { Title, Text } = Typography;

interface TaskRow {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority?: string;
  project_id?: string;
  created_at?: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'default',
  assigned: 'processing',
  in_progress: 'blue',
  completed: 'green',
  reviewed: 'success',
  rejected: 'error',
  cancelled: 'warning'
};

const MyTasks: React.FC = () => {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiCall(`/users/me/tasks?page=1&size=50`);
      const items = (data?.items || data) as any[];
      const mapped: TaskRow[] = (items || []).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        status: t.status,
        priority: t.priority,
        project_id: t.project_id,
        created_at: t.created_at
      }));
      setTasks(mapped);
    } catch (e) {
      console.error(e);
      message.error('載入我的任務失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <Content style={{ padding: '24px', paddingTop: '88px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={2} style={{ margin: 0 }}>我的任務</Title>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
            </Space>
          </div>

          <Card>
            <Table
              rowKey="id"
              loading={loading}
              dataSource={tasks}
              pagination={{ pageSize: 10 }}
              columns={[
                { title: '任務名稱', dataIndex: 'name', key: 'name', width: 260, render: (text: string, r: TaskRow) => (
                  <div>
                    <Text strong>{text}</Text>
                    <div style={{ fontSize: 12, color: '#999' }}>Task ID: {r.id}</div>
                  </div>
                )},
                { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
                { title: '狀態', dataIndex: 'status', key: 'status', width: 120, render: (s: string) => (
                  <Tag color={STATUS_COLOR[s] || 'default'}>{s}</Tag>
                )},
                { title: '優先級', dataIndex: 'priority', key: 'priority', width: 120 },
                { title: '操作', key: 'actions', width: 120, render: (_: any, r: TaskRow) => (
                  <Space>
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => {
                        if (!r.project_id) return message.warning('缺少專案ID');
                        window.open(`/projects/${r.project_id}/tasks/${r.id}/annotate`, '_blank');
                      }}
                    />
                  </Space>
                )}
              ]}
            />
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default MyTasks;


