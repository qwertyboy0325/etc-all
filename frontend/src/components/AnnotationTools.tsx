import React, { useState, useEffect } from 'react';
import {
  Card,
  Select,
  Input,
  Button,
  Space,
  Typography,
  Form,
  App,
  Tooltip,
  Divider,
  Tag,
  Progress
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  CarOutlined,
  EyeOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Types
interface VehicleType {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface Annotation {
  id?: string;
  vehicleTypeId?: string;
  confidence?: number;
  notes?: string;
  status: 'draft' | 'submitted';
}

interface SelectedPoints {
  indices: number[];
  coordinates: Array<{ x: number; y: number; z: number }>;
}

interface AnnotationToolsProps {
  annotation?: Annotation;
  vehicleTypes: VehicleType[];
  selectedPoints: SelectedPoints;
  isLoading?: boolean;
  onSave: (data: Partial<Annotation>) => void;
  onSubmit: (data: Partial<Annotation>) => void;
  onDelete?: () => void;
  onPointsSelect?: (points: SelectedPoints) => void;
  disabled?: boolean;
}

const AnnotationTools: React.FC<AnnotationToolsProps> = ({
  annotation,
  vehicleTypes,
  selectedPoints,
  isLoading = false,
  onSave,
  onSubmit,
  onDelete,
  onPointsSelect: _onPointsSelect,
  disabled = false
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [notes, setNotes] = useState<string>('');
  const [vehicleTypeId, setVehicleTypeId] = useState<string>();
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);

  // Initialize form values from annotation
  useEffect(() => {
    if (annotation) {
      setVehicleTypeId(annotation.vehicleTypeId);
      setNotes(annotation.notes || '');
      
      form.setFieldsValue({
        vehicleTypeId: annotation.vehicleTypeId,
        notes: annotation.notes || ''
      });
    }
  }, [annotation, form]);

  // Handle save draft
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      const annotationData = {
        vehicleTypeId: values.vehicleTypeId,
        confidence: 1.0, // Default confidence
        notes: values.notes,
        annotation_data: {
          selected_points: selectedPoints.indices,
          point_coordinates: selectedPoints.coordinates,
          selection_timestamp: new Date().toISOString()
        }
      };

      onSave(annotationData);
      message.success('標注已保存為草稿');
    } catch (error) {
      console.error('Save error:', error);
      message.error('保存失敗，請檢查必填項目');
    }
  };

      // Handle submit for review
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (!values.vehicleTypeId) {
        message.error('請選擇車種類型');
        return;
      }

      const annotationData = {
        vehicleTypeId: values.vehicleTypeId,
        confidence: 1.0, // Default confidence
        notes: values.notes,
        annotation_data: {
          // No points selection needed
          selection_timestamp: new Date().toISOString()
        }
      };

      onSubmit(annotationData);
      message.success('標注已提交處理');
    } catch (error) {
      console.error('Submit error:', error);
      message.error('提交失敗，請檢查必填項目');
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      message.success('標注已刪除');
    }
  };

  // Get status color and text
  const getStatusInfo = (status: string) => {
    const statusMap = {
      draft: { color: 'default', text: '草稿' },
      submitted: { color: 'success', text: '已完成' },
    };
    return statusMap[status as keyof typeof statusMap] || { color: 'default', text: '未知' };
  };

  const statusInfo = annotation ? getStatusInfo(annotation.status) : null;
  // Allow editing if draft OR submitted (revert flow)
  // const canEdit = !annotation || ['draft', 'needs_revision'].includes(annotation.status);
  const canEdit = true; // Always allow edit, backend handles revert
  const isFormDisabled = disabled || isLoading;

  return (
    <Card 
      title={
        <Space>
          <CarOutlined />
          <span>標注工具</span>
          {statusInfo && (
            <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
          )}
        </Space>
      }
      size="small"
      style={{ width: '100%', maxWidth: 400 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isFormDisabled}
      >
        {/* 點選狀態 */}
        {/* Removed point selection UI as per requirement */}

        <Divider style={{ margin: '12px 0' }} />

        {/* 車種選擇 */}
        <Form.Item
          label={
            <Space>
              車種類型
              <Tooltip title="選擇此區域中的主要車輛類型">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }
          name="vehicleTypeId"
          rules={[{ required: true, message: '請選擇車種類型' }]}
        >
          <Select
            placeholder="選擇車種類型"
            showSearch
            optionFilterProp="children"
            onChange={(value) => setVehicleTypeId(value)}
          >
            {vehicleTypes.map((type) => (
              <Option key={type.id} value={type.id}>
                <Space>
                  <Text strong>{type.name}</Text>
                  <Text type="secondary">({type.code})</Text>
                </Space>
                {type.description && (
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {type.description}
                  </div>
                )}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 備註 */}
        <Form.Item
          label="備註"
          name="notes"
        >
          <TextArea
            placeholder="添加標注備註或說明..."
            rows={3}
            maxLength={500}
            showCount
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Form.Item>

        {/* 操作按鈕 */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 主要操作 */}
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={isLoading}
                disabled={isFormDisabled}
              >
                {annotation?.status === 'submitted' 
                  ? '修改 (退回草稿)' 
                  : '保存草稿'}
              </Button>
              
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmit}
                loading={isLoading}
                disabled={isFormDisabled || !vehicleTypeId}
              >
                {annotation?.status === 'submitted' 
                  ? '重新提交' 
                  : '提交處理'}
              </Button>
            </Space>

            {/* 次要操作 */}
            {annotation && canEdit && onDelete && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
                disabled={isLoading}
                size="small"
                block
              >
                刪除標注
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>

      {/* 幫助信息 */}
      <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          💡 使用提示：
          <br />• 觀察3D視圖中的車輛
          <br />• 選擇對應的車種類型
          <br />• 調整信心度反映標注準確性
          <br />• 可添加備註說明特殊情況
        </Text>
      </div>
    </Card>
  );
};

export default AnnotationTools; 