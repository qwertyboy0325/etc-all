import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Space, Button, Typography, Select, Input, message, Popconfirm, Modal, Form, Switch } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import { apiCall } from '../utils/api';
import { usePermissions } from '../contexts/AuthContext';

const { Title } = Typography;

type GlobalRole = 'system_admin' | 'admin' | 'user';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  global_role: GlobalRole;
  is_active: boolean;
  created_at: string;
}

const roleColor: Record<GlobalRole, string> = {
  system_admin: 'purple',
  admin: 'orange',
  user: 'blue'
};

const UserManagement: React.FC = () => {
  const { isAdmin, isSystemAdmin } = usePermissions();
  const navigate = useNavigate();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<GlobalRole | undefined>(undefined);
  const [assignModal, setAssignModal] = useState<{ open: boolean; user?: UserRow }>({ open: false });
  const [projectOptions, setProjectOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  
  // Create User State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();

  useEffect(() => {
    if (!isAdmin && !isSystemAdmin) {
      message.error('您沒有權限訪問此頁面');
      navigate('/');
    }
  }, [isAdmin, isSystemAdmin, navigate]);

  const load = async () => {
    if (!isAdmin && !isSystemAdmin) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (role) params.append('role', role);
      const data = await apiCall(`/users?${params.toString()}`);
      setRows(data || []);
    } catch (e: any) {
      message.error(e?.message || '載入使用者失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAssign = async (u: UserRow) => {
    setAssignModal({ open: true, user: u });
    setSelectedProjectId(undefined);
    try {
      const data = await apiCall(`/projects/admin/all?page=1&size=100`);
      const items = data?.items || [];
      setProjectOptions(items.map((p: any) => ({ label: p.name, value: p.id })));
    } catch (e: any) {
      message.error(e?.message || '載入專案清單失敗');
    }
  };

  const doAssign = async () => {
    if (!assignModal.user || !selectedProjectId) return message.warning('請選擇專案');
    try {
      await apiCall(`/projects/${selectedProjectId}/members/assign-admin?user_id=${assignModal.user.id}`, { method: 'POST' });
      message.success('已指派為專案管理員');
      setAssignModal({ open: false });
    } catch (e: any) {
      message.error(e?.message || '指派失敗');
    }
  };

  const handleCreateUser = async () => {
    try {
      const values = await createForm.validateFields();
      const payload = {
        ...values,
        confirm_password: values.confirmPassword // Map confirmPassword to snake_case
      };
      delete payload.confirmPassword; // Remove original key

      await apiCall('/users', { method: 'POST', body: JSON.stringify(payload) });
      message.success('使用者建立成功');
      setCreateModalOpen(false);
      createForm.resetFields();
      load();
    } catch (e: any) {
      message.error(e?.message || '建立使用者失敗');
    }
  };

  const updateRole = async (userId: string, newRole: GlobalRole) => {
    try {
      await apiCall(`/users/${userId}/role?new_role=${newRole}`, { method: 'PUT' });
      message.success('角色已更新');
      load();
    } catch (e: any) {
      message.error(e?.message || '更新角色失敗');
    }
  };

  const deactivate = async (userId: string) => {
    try {
      await apiCall(`/users/${userId}`, { method: 'DELETE' });
      message.success('使用者已停用');
      load();
    } catch (e: any) {
      message.error(e?.message || '停用失敗');
    }
  };

  return (
    <PageLayout
      title="使用者管理"
      extra={
        isSystemAdmin && (
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreateModalOpen(true)}>
            新增使用者
          </Button>
        )
      }
    >
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <Input 
            placeholder="搜尋 email / 姓名" 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            allowClear 
            style={{ width: 220 }} 
          />
          <Select<GlobalRole>
            placeholder="角色"
            allowClear
            value={role}
            onChange={(v) => setRole(v)}
            style={{ width: 160 }}
            options={[
              { value: 'system_admin', label: '系統管理員' },
              { value: 'admin', label: '管理員' },
              { value: 'user', label: '一般使用者' },
            ]}
          />
          <Button type="primary" onClick={load}>搜尋</Button>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)' }}>
            <Table
              rowKey="id"
              loading={loading}
              dataSource={rows}
              pagination={{ pageSize: 20 }}
              columns={[
                { title: 'Email', dataIndex: 'email', key: 'email' },
                { title: '姓名', dataIndex: 'full_name', key: 'full_name' },
                { title: '角色', dataIndex: 'global_role', key: 'global_role', render: (r: GlobalRole) => (
                  <Tag color={roleColor[r]}>{r}</Tag>
                )},
                { title: '狀態', dataIndex: 'is_active', key: 'is_active', render: (a: boolean) => (
                  <Tag color={a ? 'green' : 'default'}>{a ? '啟用' : '停用'}</Tag>
                )},
                { title: '操作', key: 'actions', render: (_: any, u: UserRow) => (
                  <Space>
                    {isSystemAdmin && (
                      <Select<GlobalRole>
                        value={u.global_role}
                        onChange={(v) => updateRole(u.id, v)}
                        style={{ width: 160 }}
                        options={[
                          { value: 'system_admin', label: '系統管理員' },
                          { value: 'admin', label: '管理員' },
                          { value: 'user', label: '一般使用者' },
                        ]}
                      />
                    )}
                    {isSystemAdmin && (
                      <Button onClick={() => openAssign(u)}>指派專案管理員</Button>
                    )}
                    {isAdmin && (
                      <Popconfirm title="確定停用?" onConfirm={() => deactivate(u.id)}>
                        <Button danger>停用</Button>
                      </Popconfirm>
                    )}
                  </Space>
                )}
              ]}
            />
          </Card>

          <Modal
            title={`指派專案管理員：${assignModal.user?.full_name || assignModal.user?.email}`}
            open={assignModal.open}
            onCancel={() => setAssignModal({ open: false })}
            onOk={doAssign}
            okText="指派"
          >
            <Select
              placeholder="選擇專案"
              style={{ width: '100%' }}
              options={projectOptions}
              value={selectedProjectId}
              onChange={setSelectedProjectId as any}
              showSearch
              optionFilterProp="label"
            />
          </Modal>

          <Modal
            title="新增使用者"
            open={createModalOpen}
            onOk={handleCreateUser}
            onCancel={() => setCreateModalOpen(false)}
            okText="建立"
            cancelText="取消"
          >
            <Form form={createForm} layout="vertical">
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: '請輸入有效的 Email' }]}>
                    <Input placeholder="user@example.com" />
                </Form.Item>
                <Form.Item name="full_name" label="姓名" rules={[{ required: true, message: '請輸入姓名' }]}>
                    <Input placeholder="全名" />
                </Form.Item>
                <Form.Item name="password" label="密碼" rules={[{ required: true, min: 8, message: '密碼至少需 8 碼' }]}>
                    <Input.Password />
                </Form.Item>
                <Form.Item 
                    name="confirmPassword" 
                    label="確認密碼" 
                    dependencies={['password']}
                    rules={[
                        { required: true, message: '請確認密碼' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('密碼不一致'));
                            },
                        }),
                    ]}
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item name="global_role" label="系統角色" initialValue="user">
                    <Select>
                        <Select.Option value="user">一般使用者 (User)</Select.Option>
                        <Select.Option value="admin">管理員 (Admin)</Select.Option>
                        <Select.Option value="system_admin">系統管理員 (System Admin)</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name="is_active" label="狀態" initialValue={true} valuePropName="checked">
                    <Switch checkedChildren="啟用" unCheckedChildren="停用" />
                </Form.Item>
            </Form>
          </Modal>
    </PageLayout>
  );
};

export default UserManagement;


