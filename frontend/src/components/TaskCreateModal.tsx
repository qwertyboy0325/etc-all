import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Space,
  Row,
  Col,
  Divider,
  Typography
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import type { FileInfo } from '../services/fileService';

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
  availableFiles: FileInfo[];
}

export interface TaskFormData {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  maxAnnotations?: number;
  requireReview?: boolean;
  pointcloudFileId: string;
  instructions?: string;
}

const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
  availableFiles
}) => {
  const [form] = Form.useForm();

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      form.resetFields();
    }
  }, [visible, form]);

  // Handle form submission
  const handleSubmit = async (values: any) => {
    try {
      const due = values.dueDate;
      const taskData: TaskFormData = {
        name: values.name,
        description: values.description,
        priority: values.priority,
        pointcloudFileId: values.pointcloudFileId,
        maxAnnotations: values.maxAnnotations ?? 3,
        requireReview: values.requireReview ?? true,
        instructions: values.instructions,
        dueDate: due && typeof due.toDate === 'function' ? due.toDate().toISOString() : undefined
      };

      await onSubmit(taskData);
    } catch (error) {
      console.error('Task creation error:', error);
    }
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
          maxAnnotations: 3,
          requireReview: true
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

        {/* File and Schedule */}
        <Row gutter={16}>
          <Col span={24}>
            <Text strong style={{ fontSize: '16px' }}>
              <UploadOutlined style={{ marginRight: '8px' }} />
              文件與計劃
            </Text>
            <Divider style={{ margin: '12px 0' }} />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="點雲文件"
              name="pointcloudFileId"
              rules={[{ required: true, message: '請選擇點雲文件' }]}
            >
              <Select placeholder="選擇已上傳的點雲文件">
                {availableFiles.map(f => (
                  <Option key={f.id} value={f.id}>
                    <Space>
                      {f.original_filename}
                      <Text type="secondary">({Math.round(f.file_size / 1024)} KB)</Text>
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
              label="單任務最大標注數"
              name="maxAnnotations"
            >
              <InputNumber
                min={1}
                max={10}
                style={{ width: '100%' }}
                placeholder="3"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="標注說明（選填）"
          name="instructions"
        >
          <TextArea rows={3} placeholder="針對標注的特別指引..." />
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