import React, { useEffect, useState, useRef } from 'react';
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
  Typography,
  Card,
  App,
  Table,
  Tag,
  Radio,
  Tooltip,
  Tabs,
  Checkbox
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  FileTextOutlined,
  EyeOutlined,
  SearchOutlined,
  UserOutlined,
  InfoCircleOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { uploadProjectArchive, type FileInfo } from '../services/fileService';
import PointCloudRenderer, { PointCloudRendererRef } from './PointCloudRenderer';
import { parseNpyFile, calculateBounds } from '../utils/npyParser';
import { extractPointCloudFromNpzBuffer } from '../utils/npzParser';
import { API_BASE_URL, getAuthHeaders, apiCall } from '../utils/api';
import { ServerFolderBrowser } from './ServerFolderBrowser';

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
  onRefreshFiles?: () => Promise<void>;
  projectTags?: { id: string; name: string; display_name: string }[];
}

export interface TaskFormData {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  maxAnnotations?: number;
  requireReview?: boolean;
  pointcloudFileId?: string;
  pointcloudFileIds?: string[];
  assigneeIds?: string[];
  instructions?: string;
  distributeEqually?: boolean;
  // New fields for folder import
  sourcePath?: string;
  recursive?: boolean;
}

const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
  availableFiles,
  projectId,
  onRefreshFiles,
  projectTags = []
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const rendererRef = useRef<PointCloudRendererRef>(null);
  
  // File Selection State
  const [selectedFileIds, setSelectedFileIds] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('existing');
  
  // Folder Import State
  const [selectedFolderPath, setSelectedFolderPath] = useState('');
  const [selectedFolderName, setSelectedFolderName] = useState('');

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setPreviewData(null);
      setSelectedFileIds([]);
      setSearchText('');
      setActiveTab('existing');
      setSelectedFolderPath('');
      setSelectedFolderName('');
    } else {
      loadProjectMembers();
    }
  }, [visible, form]);

  // Update task name field when selection changes
  useEffect(() => {
    if (activeTab === 'existing') {
        if (selectedFileIds.length === 1) {
            const file = availableFiles.find(f => f.id === selectedFileIds[0]);
            if (file) {
                form.setFieldsValue({ name: file.original_filename });
                handlePreviewFile(file.id);
            }
        } else if (selectedFileIds.length > 1) {
            form.setFieldsValue({ name: 'Task' }); // Default prefix
            setPreviewData(null); 
        }
    }
  }, [selectedFileIds, activeTab]);

  const loadProjectMembers = async () => {
    if (!projectId) return;
    try {
      const data = await apiCall(`/projects/${projectId}/members?page=1&size=100&active_only=true`);
      const items = Array.isArray(data) ? data : data.items || [];
      setProjectMembers(items);
    } catch (e) {
      console.error('Failed to load members', e);
    }
  };

  // 預覽點雲文件
  const handlePreviewFile = async (fileId: string) => {
    try {
      setPreviewLoading(true);
      const file = availableFiles.find(f => f.id === fileId);
      if (!file) return;

      // 下載文件：優先專案簽名URL，其次本地開發端點
      let arrayBuffer: ArrayBuffer | null = null;
      if (projectId) {
        const signed = await fetch(`${API_BASE_URL}/projects/${projectId}/files/${fileId}/download`, { headers: getAuthHeaders() });
        if (signed.ok) {
          const meta = await signed.json();
          const binResp = await fetch(meta.download_url, { headers: getAuthHeaders() });
          if (!binResp.ok) throw new Error('Failed to fetch signed URL');
          arrayBuffer = await binResp.arrayBuffer();
        }
      }
      if (!arrayBuffer) {
        const fallback = await fetch(`${API_BASE_URL}/files/${fileId}/download`, { headers: getAuthHeaders() });
        if (!fallback.ok) throw new Error('Failed to download file');
        arrayBuffer = await fallback.arrayBuffer();
      }

      // 解析文件
      let pointCloudData;
      const filename = (file.original_filename || file.filename || '').toLowerCase();
      if (filename.endsWith('.npz')) {
        pointCloudData = await extractPointCloudFromNpzBuffer(arrayBuffer);
      } else {
        const npyData = parseNpyFile(arrayBuffer);
        pointCloudData = {
          positions: npyData.data,
          pointCount: npyData.shape[0],
          bounds: calculateBounds(npyData.data)
        };
      }

      setPreviewData(pointCloudData);
    } catch (error) {
      console.error('Failed to preview file:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleInlineUpload = async (file: File) => {
    if (!projectId) {
      return message.error('缺少專案ID，無法上傳');
    }
    try {
      setUploading(true);
      
      if (file.name.toLowerCase().endsWith('.zip')) {
        // ZIP upload
        const resps = await uploadProjectArchive(projectId, file);
        message.success(`ZIP 上傳成功，解析出 ${resps.length} 個檔案`);
        if (onRefreshFiles) await onRefreshFiles();
        // ZIP upload doesn't auto-select a single file
      } else {
        // Single file upload
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);
        const resp = await fetch(`${API_BASE_URL}/projects/${projectId}/files/upload`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
          body: formData
        });
        if (!resp.ok) throw new Error(`Upload failed: HTTP ${resp.status}`);
        const data = await resp.json();
        const newFileId = data.file_id;
        message.success('上傳成功，已加入檔案清單');
        if (onRefreshFiles) await onRefreshFiles();
        
        // Auto select uploaded file
        setSelectedFileIds([newFileId]);
      }
    } catch (e: any) {
      message.error(e?.message || '上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (values: any) => {
    try {
      // Mode 1: Folder Import
      if (activeTab === 'folder') {
        if (!selectedFolderPath) {
            message.error('請選擇一個伺服器目錄');
            return;
        }
        
        await apiCall(`/projects/${projectId}/tasks/import-folder`, {
            method: 'POST',
            body: JSON.stringify({
                source_path: selectedFolderPath,
                recursive: values.recursive,
                name_prefix: values.name || 'Task',
                priority: values.priority,
                max_annotations: values.maxAnnotations,
                require_review: values.requireReview,
                due_date: values.dueDate,
                instructions: values.instructions,
                assignee_ids: values.assigneeIds,
                distribute_equally: values.distributeEqually
            })
        });
        message.success('已啟動背景匯入與任務建立流程');
        onCancel(); // Close modal directly without triggering validation
        return;
      }

      // Mode 2: Existing Files
      if (selectedFileIds.length === 0) {
        message.error('請至少選擇一個點雲檔案');
        return;
      }

      const due = values.dueDate;
        const taskData: TaskFormData = {
        name: values.name,
        description: values.description,
        priority: values.priority,
        pointcloudFileIds: selectedFileIds as string[],
        maxAnnotations: values.maxAnnotations ?? 3,
        requireReview: values.requireReview ?? false,
        instructions: values.instructions,
        dueDate: due && typeof due.toDate === 'function' ? due.toDate().toISOString() : undefined,
        assigneeIds: values.assigneeIds,
        distributeEqually: values.distributeEqually
      };

      await onSubmit(taskData);
    } catch (error: any) {
      console.error('Task creation error:', error);
      message.error(error.message || '操作失敗');
    }
  };

  const filteredFiles = availableFiles.filter(f => 
    f.original_filename.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderFileSelection = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong><FileTextOutlined /> 選擇點雲檔案 ({selectedFileIds.length})</Text>
            <Space>
                <Input 
                    prefix={<SearchOutlined />} 
                    placeholder="搜尋檔名" 
                    size="small" 
                    style={{ width: 120 }}
                    onChange={e => setSearchText(e.target.value)}
                />
                <Button 
                    size="small"
                    icon={<UploadOutlined />}
                    loading={uploading}
                    onClick={async () => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.npy,.npz,.ply,.pcd,.zip';
                        input.onchange = async (e: any) => {
                            const file = e.target.files?.[0];
                            if (file) await handleInlineUpload(file);
                        };
                        input.click();
                    }}
                >
                    上傳
                </Button>
            </Space>
        </div>
                <Table
                    rowSelection={{
                        type: 'checkbox',
                        selectedRowKeys: selectedFileIds,
                        onChange: (keys) => setSelectedFileIds(keys),
                        getCheckboxProps: (record) => ({
                            disabled: record.status !== 'processed' && record.status !== 'uploaded',
                        }),
                    }}
                    columns={[
                        {
                            title: '檔名',
                            dataIndex: 'original_filename',
                            key: 'name',
                            render: (text: string) => <Text strong>{text}</Text>
                        },
                        {
                            title: '大小',
                            dataIndex: 'file_size',
                            key: 'size',
                            render: (v: number) => `${(v/1024).toFixed(1)} KB`
                        },
                        {
                            title: '狀態',
                            dataIndex: 'status',
                            key: 'status',
                            render: (status: string) => (
                                <Tag color={status === 'processed' || status === 'uploaded' ? 'success' : 'processing'}>{status}</Tag>
                            )
                        }
                    ]}
                    dataSource={filteredFiles}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 10, size: 'small' }}
                    scroll={{ y: 400 }}
                />
    </div>
  );

  const renderFolderSelection = () => (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 16 }}>
              <Text strong><FolderOpenOutlined /> 從伺服器目錄選擇</Text>
              {selectedFolderPath && (
                  <div style={{ marginTop: 8, padding: '8px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
                      已選擇: <strong>{selectedFolderName || selectedFolderPath}</strong>
                  </div>
              )}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ServerFolderBrowser 
                height="100%"
                onSelect={(path, item) => {
                    setSelectedFolderPath(path);
                    setSelectedFolderName(item.name);
                    form.setFieldsValue({ name: item.name });
                    message.info(`已選擇目錄: ${item.name}`);
                }}
                selectButtonText="使用此目錄"
            />
          </div>
          <div style={{ marginTop: 16 }}>
              <Form.Item name="recursive" valuePropName="checked" noStyle>
                  <Checkbox>包含子目錄 (Recursive)</Checkbox>
              </Form.Item>
          </div>
      </div>
  );

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined />
          <span>
              {activeTab === 'folder' ? '從目錄創建任務' : (selectedFileIds.length > 1 ? '批量創建任務' : '創建新任務')}
          </span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      destroyOnHidden
      centered
      zIndex={1200}
      style={{ maxWidth: 'calc(100vw - 48px)' }}
      styles={{
        body: { maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
        initialValues={{
          priority: 'medium',
          maxAnnotations: 3,
          requireReview: false,
          recursive: false
        }}
      >
        <Row gutter={24} style={{ height: '600px' }}>
            {/* Left Column: Source Selection */}
            <Col span={12} style={{ borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        { key: 'existing', label: '現有檔案', children: renderFileSelection() },
                        { key: 'folder', label: '伺服器目錄', children: renderFolderSelection() }
                    ]}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                    tabBarStyle={{ marginBottom: 16 }}
                />
            </Col>

            {/* Right Column: Task Details */}
            <Col span={12} style={{ overflowY: 'auto' }}>
                <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: 16, marginTop: 12 }}>
                  <FileTextOutlined style={{ marginRight: '8px' }} />
                  任務設定
                </Text>

                <Form.Item
                  label={activeTab === 'folder' || selectedFileIds.length > 1 ? "任務名稱前綴" : "任務名稱"}
                  name="name"
                  rules={[
                    { required: true, message: '請輸入名稱' },
                    { min: 3, message: '至少需要3個字符' }
                  ]}
                  extra={(activeTab === 'folder' || selectedFileIds.length > 1) ? "任務名稱將為：前綴 + 原始檔名" : undefined}
                >
                  <Input placeholder={(activeTab === 'folder' || selectedFileIds.length > 1) ? "Task" : "例如：城市道路車輛標注"} />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
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
                  <Col span={12}>
                    <Form.Item
                      label="截止日期"
                      name="dueDate"
                    >
                      <DatePicker 
                        style={{ width: '100%' }}
                        placeholder="選擇日期"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
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
                    <Col span={12}>
                         {/* Assignees */}
                        <Form.Item
                            label="分配給成員"
                            name="assigneeIds"
                        >
                            <Select
                                mode="multiple"
                                placeholder="選擇成員"
                                optionFilterProp="children"
                                maxTagCount={2}
                            >
                                {projectMembers.map(m => (
                                    <Option key={m.user.id} value={m.user.id}>
                                        <Space>
                                            <UserOutlined />
                                            {m.user.full_name || m.user.email}
                                        </Space>
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                {/* Assignment Strategy (Only if assignees selected) */}
                <Form.Item
                    shouldUpdate={(prev, curr) => prev.assigneeIds !== curr.assigneeIds}
                    noStyle
                >
                    {({ getFieldValue }) => {
                        const assignees = getFieldValue('assigneeIds');
                        if (assignees && assignees.length > 0) {
                            return (
                                <Form.Item
                                    name="distributeEqually"
                                    label={
                                        <Space>
                                            <span>分配策略</span>
                                            <Tooltip title="選擇如何將任務分配給選中的成員">
                                                <InfoCircleOutlined />
                                            </Tooltip>
                                        </Space>
                                    }
                                    initialValue={false}
                                >
                                    <Radio.Group>
                                        <Radio value={false}>每人皆需標註 (Replicate)</Radio>
                                        <Radio value={true}>平均分配任務 (Distribute)</Radio>
                                    </Radio.Group>
                                </Form.Item>
                            );
                        }
                        return null;
                    }}
                </Form.Item>

                <Form.Item
                  label="任務描述"
                  name="description"
                  rules={[
                    { required: false }, 
                    { min: 5, message: '至少需要5個字符' }
                  ]}
                >
                  <TextArea
                    rows={3}
                    placeholder="任務目標與要求..."
                  />
                </Form.Item>
                
                 {/* Tags */}
                 <Form.Item
                    label="標籤"
                    name="tags"
                >
                    <Select
                        mode="multiple"
                        style={{ width: '100%' }}
                        placeholder="選擇標籤"
                        optionFilterProp="children"
                    >
                        {projectTags.map(tag => (
                            <Option key={tag.id} value={tag.name}>
                                {tag.display_name} ({tag.name})
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                {/* Preview Section (Only for single file EXISTING mode) */}
                {activeTab === 'existing' && selectedFileIds.length === 1 && (
                    <div style={{ marginTop: 16 }}>
                        <Divider orientation="left" plain>點雲預覽</Divider>
                         {previewData ? (
                            <div style={{ height: '200px', border: '1px solid #eee', borderRadius: 4 }}>
                                <PointCloudRenderer
                                    ref={rendererRef}
                                    data={previewData}
                                    pointSize={2}
                                    pointColor="#00ff00"
                                    backgroundColor="#000000"
                                />
                            </div>
                         ) : (
                             <div style={{ textAlign: 'center', padding: 20, background: '#f5f5f5', color: '#999' }}>
                                 {previewLoading ? '載入中...' : '選擇單一檔案以預覽'}
                             </div>
                         )}
                    </div>
                )}

                {/* Footer Buttons */}
                <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={onCancel}>
                      取消
                    </Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      disabled={
                          activeTab === 'existing' ? selectedFileIds.length === 0 : !selectedFolderPath
                      }
                    >
                      {activeTab === 'folder' 
                        ? '匯入並創建任務' 
                        : (selectedFileIds.length > 1 ? `批量創建 (${selectedFileIds.length})` : '創建任務')
                      }
                    </Button>
                  </Space>
                </Form.Item>
            </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default TaskCreateModal;
