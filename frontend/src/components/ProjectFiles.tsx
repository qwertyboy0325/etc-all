import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Upload, App, Modal, Form, Select, InputNumber, Typography, Tag, List, Breadcrumb, Card, Radio } from 'antd';
import { UploadOutlined, PlusOutlined, ReloadOutlined, FileZipOutlined, ImportOutlined, FolderOpenOutlined, ArrowLeftOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import { uploadProjectArchive, getLocalFolders, importLocalFiles, type FileInfo, type LocalFolderItem } from '../services/fileService';
import { ServerFolderBrowser } from './ServerFolderBrowser';
import { apiCall } from '../utils/api';
import { usePermissions } from '../contexts/AuthContext';

const { Text } = Typography;

interface Props {
  projectId: string;
}

const ProjectFiles: React.FC<Props> = ({ projectId }) => {
  const { message } = App.useApp();
  const { isAdmin, isSystemAdmin } = usePermissions();
  const canManage = isAdmin || isSystemAdmin; // Only admins can upload/batch create tasks
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [uploading, setUploading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Local Import State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [localFolders, setLocalFolders] = useState<LocalFolderItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);

  const loadProjectMembers = async () => {
      try {
          const data = await apiCall(`/projects/${projectId}/members?page=1&size=100&active_only=true`);
          const items = Array.isArray(data) ? data : data.items || [];
          setProjectMembers(items);
      } catch (e) {
          console.error('Failed to load members', e);
      }
  };

  useEffect(() => {
      if (projectId && createModalOpen) {
          loadProjectMembers();
      }
  }, [projectId, createModalOpen]);

  const loadLocalFolders = async (path: string = '') => {
      try {
          const data = await getLocalFolders(path);
          setLocalFolders(data);
          setCurrentPath(path);
      } catch (e: any) {
          message.error('無法讀取伺服器目錄: ' + (e.message || '未知錯誤'));
      }
  };

  const handleImportLocal = async (path: string) => {
      setImporting(true);
      try {
          const res = await importLocalFiles(projectId, path, true);
          message.success(`成功匯入 ${res.length} 個檔案`);
          setImportModalOpen(false);
          loadFiles();
      } catch (e: any) {
          message.error(e.message || '匯入失敗');
      } finally {
          setImporting(false);
      }
  };

  const loadFiles = async () => {
    setLoading(true);
    try {
        const data = await apiCall(`/projects/${projectId}/files?page=1&size=100`);
        setFiles(Array.isArray(data) ? data : data.items || []);
    } catch (e: any) {
        console.error(e);
        message.error('無法載入檔案列表');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { 
      if (projectId) loadFiles(); 
  }, [projectId]);

  const handleBatchCreate = async (values: any) => {
      try {
          await apiCall(`/projects/${projectId}/tasks/batch`, {
              method: 'POST',
              body: JSON.stringify({
                  file_ids: selectedRowKeys,
                  name_prefix: 'Task',
                  priority: values.priority,
                  max_annotations: values.maxAnnotations,
                  require_review: true,
                  assignee_ids: values.assigneeIds,
                  distribute_equally: values.distributeEqually
              })
          });
          message.success(`已成功建立任務`);
          setCreateModalOpen(false);
          setSelectedRowKeys([]);
      } catch (e: any) {
          message.error(e.message || '批量建立失敗');
      }
  };

  const columns = [
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
          render: (v: number) => `${(v/1024/1024).toFixed(2)} MB` 
      },
      { 
          title: '點數', 
          dataIndex: 'point_count', 
          key: 'points',
          render: (v: number) => v ? v.toLocaleString() : '-'
      },
      { 
          title: '上傳時間', 
          dataIndex: 'created_at', 
          key: 'date', 
          render: (v: string) => new Date(v).toLocaleString() 
      },
          { 
          title: '狀態', 
          dataIndex: 'status', 
          key: 'status',
          render: (status: string) => {
              const isReady = status === 'processed' || status === 'uploaded';
              const color = isReady ? 'green' : status === 'processing' ? 'blue' : 'default';
              return <Tag color={color}>{status}</Tag>;
          }
      }
  ];

  return (
      <div style={{ padding: 0 }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                  <Button icon={<ReloadOutlined />} onClick={loadFiles} loading={loading}>重新整理</Button>
                  {canManage && (
                    <>
                        <Button 
                            icon={<ImportOutlined />} 
                            onClick={() => { 
                                setImportModalOpen(true); 
                                loadLocalFolders(''); 
                            }}
                        >
                            從伺服器匯入
                        </Button>
                        <Upload 
                        beforeUpload={async (file) => {
                            if (file.name.toLowerCase().endsWith('.zip')) {
                                setUploading(true);
                                try {
                                    await uploadProjectArchive(projectId, file);
                                    message.success('ZIP 上傳成功，正在背景處理...');
                                    setTimeout(loadFiles, 2000); // Delay reload to show updates
                                } catch (e: any) { 
                                    message.error(e.message || '上傳失敗'); 
                                } finally {
                                    setUploading(false);
                                }
                                return false;
                            }
                            message.error('請上傳 ZIP 檔案');
                            return false; 
                        }}
                        showUploadList={false}
                        accept=".zip"
                        disabled={uploading}
                    >
                        <Button icon={<FileZipOutlined />} loading={uploading} type="dashed">
                            批量上傳 (ZIP)
                        </Button>
                    </Upload>
                    </>
                  )}
              </Space>
              {canManage && (
                <Space>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        disabled={selectedRowKeys.length === 0}
                        onClick={() => setCreateModalOpen(true)}
                    >
                        為選中檔案建立任務 ({selectedRowKeys.length})
                    </Button>
                </Space>
              )}
          </div>

          <Table 
            rowSelection={canManage ? {
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                getCheckboxProps: (record) => ({
                    disabled: record.status !== 'processed' && record.status !== 'uploaded', // Allow processed or uploaded
                }),
            } : undefined}
            columns={columns}
            dataSource={files}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
          />

          <Modal
            title="批量建立任務"
            open={createModalOpen}
            onCancel={() => setCreateModalOpen(false)}
            onOk={form.submit}
            okText="確認建立"
            cancelText="取消"
          >
              <Form 
                form={form} 
                onFinish={handleBatchCreate} 
                layout="vertical" 
                initialValues={{ priority: 'medium', maxAnnotations: 3 }}
              >
                  <Form.Item name="assigneeIds" label="分配給成員 (可選)">
                      <Select
                          mode="multiple"
                          placeholder="選擇成員"
                          optionFilterProp="label"
                      >
                          {projectMembers.map(m => (
                              <Select.Option key={m.user.id} value={m.user.id} label={m.user.full_name || m.user.email}>
                                  {m.user.full_name || m.user.email} ({m.role})
                              </Select.Option>
                          ))}
                      </Select>
                  </Form.Item>
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
                                    label="分配策略"
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
                  <Form.Item name="priority" label="任務優先級">
                      <Select>
                          <Select.Option value="low">低 (Low)</Select.Option>
                          <Select.Option value="medium">中 (Medium)</Select.Option>
                          <Select.Option value="high">高 (High)</Select.Option>
                          <Select.Option value="urgent">緊急 (Urgent)</Select.Option>
                      </Select>
                  </Form.Item>
                  <Form.Item name="maxAnnotations" label="單任務最大標註數">
                      <InputNumber min={1} max={5} style={{ width: '100%' }} />
                  </Form.Item>
                  <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                      <Text type="secondary">
                          系統將為選中的 <strong>{selectedRowKeys.length}</strong> 個檔案建立任務。
                          任務名稱將使用原始檔名或前綴。
                      </Text>
                  </div>
              </Form>
          </Modal>

          <Modal
            title="從伺服器匯入 (raw_data)"
            open={importModalOpen}
            onCancel={() => setImportModalOpen(false)}
            footer={null}
            width={700}
            destroyOnHidden
          >
            <ServerFolderBrowser 
                onSelect={(path, item) => {
                    if (importing) return;
                    Modal.confirm({
                        title: '確認匯入',
                        content: `確定要匯入 "${item.name}" 目錄中的所有檔案嗎？`,
                        onOk: () => handleImportLocal(path)
                    });
                }}
                selectButtonText="匯入此目錄"
            />
          </Modal>
      </div>
  );
};

export default ProjectFiles;

