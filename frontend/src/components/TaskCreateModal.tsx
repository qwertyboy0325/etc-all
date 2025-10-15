import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Space,
  Upload,
  message,
  Row,
  Col,
  Divider,
  Typography
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  FileTextOutlined,
  UserOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

// Types
interface TaskCreateModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (taskData: TaskFormData) => void;
  loading?: boolean;
  projectId: string;
}

export interface TaskFormData {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  dueDate?: string;
  estimatedHours?: number;
  pointCloudFiles: UploadFile[];
  tags: string[];
}

// Mock users for assignment
const mockUsers = [
  { id: '1', name: 'Admin User', email: 'admin@etc.com' },
  { id: '2', name: '張小明', email: 'zhang@etc.com' },
  { id: '3', name: '李小華', email: 'li@etc.com' },
  { id: '4', name: '王小紅', email: 'wang@etc.com' },
  { id: '5', name: '陳小美', email: 'chen@etc.com' }
];

const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setFileList([]);
    }
  }, [visible, form]);

  // Handle form submission
  const handleSubmit = async (values: any) => {
    try {
      const taskData: TaskFormData = {
        ...values,
        pointCloudFiles: fileList,
        tags: values.tags || []
      };

      await onSubmit(taskData);
    } catch (error) {
      console.error('Task creation error:', error);
    }
  };

  // Handle file upload
  const handleUpload = {
    beforeUpload: (file: UploadFile) => {
      // Check file type
      const isValidType = file.name?.toLowerCase().endsWith('.npy') || 
                         file.name?.toLowerCase().endsWith('.npz') ||
                         file.name?.toLowerCase().endsWith('.ply') ||
                         file.name?.toLowerCase().endsWith('.pcd');
      
      if (!isValidType) {
        message.error('只支持 .npy, .npz, .ply, .pcd 格式的文件');
        return false;
      }

      // Check file size (100MB limit)
      const isLt100M = file.size ? file.size / 1024 / 1024 < 100 : true;
      if (!isLt100M) {
        message.error('文件大小不能超過100MB');
        return false;
      }

      // Add to file list
      setFileList(prev => [...prev, file]);
      message.success(`${file.name} 文件添加成功`);
      
      return false; // Prevent automatic upload
    },
    onRemove: (file: UploadFile) => {
      setFileList(prev => prev.filter(f => f.uid !== file.uid));
    },
    fileList: fileList
  };

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined />
          <span>創建新任務</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
        initialValues={{
          priority: 'medium',
          estimatedHours: 8
        }}
      >
        {/* Basic Information */}
        <Row gutter={16}>
          <Col span={24}>
            <Text strong style={{ fontSize: '16px' }}>
              <FileTextOutlined style={{ marginRight: '8px' }} />
              基本信息
            </Text>
            <Divider style={{ margin: '12px 0' }} />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              label="任務名稱"
              name="name"
              rules={[
                { required: true, message: '請輸入任務名稱' },
                { min: 3, message: '任務名稱至少需要3個字符' }
              ]}
            >
              <Input placeholder="例如：城市道路車輛標注" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="優先級"
              name="priority"
            >
              <Select>
                <Option value="low">低</Option>
                <Option value="medium">中</Option>
                <Option value="high">高</Option>
                <Option value="urgent">緊急</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="任務描述"
          name="description"
          rules={[
            { required: true, message: '請輸入任務描述' },
            { min: 10, message: '任務描述至少需要10個字符' }
          ]}
        >
          <TextArea
            rows={3}
            placeholder="詳細描述任務目標、要求和注意事項..."
          />
        </Form.Item>

        {/* Assignment and Schedule */}
        <Row gutter={16}>
          <Col span={24}>
            <Text strong style={{ fontSize: '16px' }}>
              <UserOutlined style={{ marginRight: '8px' }} />
              分配與計劃
            </Text>
            <Divider style={{ margin: '12px 0' }} />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="指派給"
              name="assignedTo"
            >
              <Select placeholder="選擇標注員（可以稍後分配）" allowClear>
                {mockUsers.map(user => (
                  <Option key={user.id} value={user.id}>
                    <Space>
                      <UserOutlined />
                      {user.name}
                      <Text type="secondary">({user.email})</Text>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="截止日期"
              name="dueDate"
            >
              <DatePicker 
                style={{ width: '100%' }}
                placeholder="選擇截止日期"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="預估工時（小時）"
              name="estimatedHours"
            >
              <InputNumber
                min={1}
                max={200}
                style={{ width: '100%' }}
                placeholder="8"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* File Upload */}
        <Row gutter={16}>
          <Col span={24}>
            <Text strong style={{ fontSize: '16px' }}>
              <UploadOutlined style={{ marginRight: '8px' }} />
              點雲文件
            </Text>
            <Divider style={{ margin: '12px 0' }} />
          </Col>
        </Row>

        <Form.Item
          label="上傳點雲文件"
          required
          help="支持 .npy, .npz, .ply, .pcd 格式，單個文件最大100MB"
        >
          <Upload
            {...handleUpload}
            multiple
            listType="text"
            showUploadList={{
              showPreviewIcon: true,
              showDownloadIcon: false,
              showRemoveIcon: true
            }}
          >
            <Button icon={<UploadOutlined />}>
              選擇文件
            </Button>
          </Upload>
          
          {fileList.length === 0 && (
            <div style={{ 
              marginTop: '8px', 
              padding: '16px', 
              border: '1px dashed #d9d9d9',
              borderRadius: '6px',
              textAlign: 'center',
              color: '#999'
            }}>
              <UploadOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <div>拖拽文件到此處或點擊上傳</div>
            </div>
          )}
        </Form.Item>

        {/* Tags */}
        <Form.Item
          label="標籤"
          name="tags"
          help="輸入後按回車添加標籤"
        >
          <Select
            mode="tags"
            style={{ width: '100%' }}
            placeholder="添加標籤（如：城市道路、高速公路、停車場等）"
            tokenSeparators={[',']}
          />
        </Form.Item>

        {/* Footer */}
        <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '24px' }}>
          <Space>
            <Button onClick={onCancel}>
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={fileList.length === 0}
            >
              創建任務
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TaskCreateModal; 