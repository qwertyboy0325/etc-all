import React, { useEffect, useState } from 'react';
import { Layout, Card, Table, Tag, Space, Button, Typography, Select, Input, message, Popconfirm, Modal } from 'antd';
import Navbar from '../components/Navbar';
import { apiCall } from '../utils/api';
import { usePermissions } from '../contexts/AuthContext';

const { Content } = Layout;
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
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<GlobalRole | undefined>(undefined);
  const [assignModal, setAssignModal] = useState<{ open: boolean; user?: UserRow }>({ open: false });
  const [projectOptions, setProjectOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

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
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <Content style={{ padding: '24px', paddingTop: '88px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={2} style={{ margin: 0 }}>使用者管理</Title>
            <Space>
              <Input placeholder="搜尋 email / 姓名" value={q} onChange={(e) => setQ(e.target.value)} allowClear style={{ width: 220 }} />
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

          <Card>
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
        </div>
      </Content>
    </Layout>
  );
};

export default UserManagement;


