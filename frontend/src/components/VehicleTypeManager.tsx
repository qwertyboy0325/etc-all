import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, App, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiCall } from '../utils/api';

interface VehicleType {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  color?: string;
  is_active: boolean;
}

interface Props {
  projectId: string;
  canManage: boolean;
}

export const VehicleTypeManager: React.FC<Props> = ({ projectId, canManage }) => {
  const { message } = App.useApp();
  const [types, setTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<VehicleType | null>(null);
  const [form] = Form.useForm();

  const fetchTypes = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await apiCall(`/projects/${projectId}/vehicle-types`);
      setTypes(data);
    } catch (err) {
      message.error('Failed to load vehicle types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, [projectId]);

  useEffect(() => {
    if (isModalOpen) {
      if (editingType) {
        form.setFieldsValue(editingType);
      } else {
        form.resetFields();
        form.setFieldsValue({ color: '#ff0000' });
      }
    }
  }, [isModalOpen, editingType, form]);

  const handleAdd = () => {
    setEditingType(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record: VehicleType) => {
    setEditingType(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiCall(`/projects/${projectId}/vehicle-types/${id}`, { method: 'DELETE' });
      message.success('Vehicle type deleted');
      fetchTypes();
    } catch (err: any) {
      message.error(err.message || 'Failed to delete');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const url = editingType 
        ? `/projects/${projectId}/vehicle-types/${editingType.id}`
        : `/projects/${projectId}/vehicle-types`;
      const method = editingType ? 'PUT' : 'POST';

      await apiCall(url, { method, body: JSON.stringify(values) });
      
      message.success(`Vehicle type ${editingType ? 'updated' : 'created'}`);
      setIsModalOpen(false);
      fetchTypes();
    } catch (err) {
      // validation error or api error
    }
  };

  const columns = [
    {
      title: 'Display Name',
      dataIndex: 'display_name',
      key: 'display_name',
      render: (text: string, record: VehicleType) => (
         <Space>
            {record.color && <div style={{width: 12, height: 12, background: record.color, borderRadius: '50%'}} />}
            {text}
         </Space>
      )
    },
    {
      title: 'Internal Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Tag>{text}</Tag>
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: VehicleType) => canManage && (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this label?" description="This cannot be undone if used." onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Annotation Labels (Vehicle Types)</h3>
        <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTypes} loading={loading} />
            {canManage && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Add Label
                </Button>
            )}
        </Space>
      </div>

      <Table 
        columns={columns} 
        dataSource={types} 
        rowKey="id" 
        loading={loading} 
        pagination={false}
        size="small"
        bordered
      />

      <Modal
        title={editingType ? "Edit Label" : "Create Label"}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="display_name" 
            label="Display Name" 
            rules={[{ required: true, message: 'Please enter a display name' }]}
            tooltip="The name shown to annotators"
          >
            <Input placeholder="e.g. Passenger Car" />
          </Form.Item>
          
          <Form.Item 
            name="name" 
            label="Internal Code" 
            rules={[{ required: true, message: 'Please enter a unique code' }]}
            tooltip="Unique identifier for this label (e.g. car_passenger)"
          >
            <Input placeholder="e.g. car_passenger" disabled={!!editingType} />
          </Form.Item>
          
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          
          <Form.Item name="color" label="Color" initialValue="#ff0000">
             <Input type="color" style={{width: '100%', height: 32}} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};


