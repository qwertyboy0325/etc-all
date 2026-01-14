import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, App, Space, Tag, Popconfirm, Avatar, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, UserOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import { apiCall } from '../utils/api';

const { Text } = Typography;
const { Option } = Select;

interface ProjectMember {
  id: string;
  user_id: string;
  role: 'project_admin' | 'annotator' | 'reviewer' | 'viewer';
  is_active: boolean;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
}

interface Props {
  projectId: string;
  canManage: boolean;
  visible: boolean;
  onClose: () => void;
}

export const ProjectMemberManager: React.FC<Props> = ({ projectId, canManage, visible, onClose }) => {
  const { message } = App.useApp();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchMembers = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await apiCall(`/projects/${projectId}/members?page=1&size=100`);
      setMembers(Array.isArray(data) ? data : data.items || []);
    } catch (err: any) {
      message.error(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiCall('/users?page=1&size=100');
      setUsers(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (visible && projectId) {
      fetchMembers();
    }
  }, [visible, projectId]);

  const handleAdd = async () => {
    await fetchUsers();
    form.resetFields();
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async () => {
    try {
      const values = await form.validateFields();
      // Check if user is already a member
      if (members.some(m => m.user_id === values.userId)) {
        message.warning('該使用者已是專案成員');
        return;
      }

      await apiCall(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: values.userId,
          role: values.role
        })
      });
      message.success('成功新增成員');
      setIsAddModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      message.error(err.message || '新增失敗');
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await apiCall(`/projects/${projectId}/members/${memberId}`, { method: 'DELETE' });
      message.success('已移除成員');
      fetchMembers();
    } catch (err: any) {
      message.error(err.message || '移除失敗');
    }
  };

  const columns = [
    {
      title: '使用者',
      key: 'user',
      render: (_: any, record: ProjectMember) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} />
          <div>
            <Text strong style={{ display: 'block' }}>{record.user.full_name || 'Unknown'}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.user.email}</Text>
          </div>
        </Space>
      )
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        let color = 'default';
        let text = role;
        switch(role) {
            case 'project_admin': color = 'volcano'; text = '專案管理員'; break;
            case 'annotator': color = 'blue'; text = '標註員'; break;
            case 'reviewer': color = 'geekblue'; text = '處理員'; break;
            case 'viewer': color = 'green'; text = '訪客'; break;
        }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ProjectMember) => canManage && (
        <Popconfirm title="確定移除此成員?" onConfirm={() => handleRemove(record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }
  ];

  return (
    <Modal
      title={<Space><TeamOutlined /> 專案成員管理</Space>}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchMembers} loading={loading}>重新整理</Button>
            {canManage && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    新增成員
                </Button>
            )}
        </Space>
      </div>

      <Table
        dataSource={members}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 5 }}
        size="small"
      />

      <Modal
        title="新增專案成員"
        open={isAddModalOpen}
        onOk={handleAddSubmit}
        onCancel={() => setIsAddModalOpen(false)}
        destroyOnHidden
        okText="新增"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" initialValues={{ role: 'annotator' }}>
          <Form.Item 
            name="userId" 
            label="選擇使用者" 
            rules={[{ required: true, message: '請選擇使用者' }]}
          >
            <Select 
                showSearch 
                placeholder="搜尋 Email 或姓名" 
                optionFilterProp="children"
                filterOption={(input, option) => 
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
            >
                {users.map(u => (
                    <Option key={u.id} value={u.id} label={`${u.full_name} ${u.email}`}>
                        {u.full_name} ({u.email})
                    </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item 
            name="role" 
            label="角色權限" 
            rules={[{ required: true, message: '請選擇角色' }]}
            extra="標註員：僅能執行標註任務，無法設定專案。"
          >
            <Select>
                <Option value="annotator">標註員 (Annotator)</Option>
                <Option value="reviewer">處理員 (Processor)</Option>
                <Option value="project_admin">專案管理員 (Project Admin)</Option>
                <Option value="viewer">訪客 (Viewer)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};






