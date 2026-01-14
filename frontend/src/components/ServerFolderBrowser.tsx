import React, { useState, useEffect } from 'react';
import { Card, Button, List, Breadcrumb, App } from 'antd';
import { FolderOpenOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { getLocalFolders, type LocalFolderItem } from '../services/fileService';

interface Props {
  onSelect: (path: string, item: LocalFolderItem) => void;
  height?: string | number;
  selectButtonText?: string;
}

export const ServerFolderBrowser: React.FC<Props> = ({ 
    onSelect, 
    height = 400,
    selectButtonText = "選取" 
}) => {
  const { message } = App.useApp();
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<LocalFolderItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFolders = async (path: string = '') => {
    setLoading(true);
    try {
      const data = await getLocalFolders(path);
      setItems(data);
      setCurrentPath(path);
    } catch (e: any) {
      message.error('無法讀取伺服器目錄: ' + (e.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders('');
  }, []);

  return (
    <Card 
        size="small" 
        style={{ height: height, display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' } }}
        title={
            <Breadcrumb
                items={[
                    { title: <a onClick={() => loadFolders('')}>root</a> },
                    ...currentPath.split('/').filter(Boolean).map((p, i, arr) => ({
                        title: <a onClick={() => loadFolders(arr.slice(0, i+1).join('/'))}>{p}</a>
                    }))
                ]}
            />
        }
        extra={
            currentPath && (
                <Button 
                    size="small" 
                    icon={<ArrowLeftOutlined />} 
                    onClick={() => {
                        const parts = currentPath.split('/');
                        parts.pop();
                        loadFolders(parts.join('/'));
                    }}
                >
                    返回
                </Button>
            )
        }
    >
        <div style={{ flex: 1, overflowY: 'auto' }}>
            <List
                itemLayout="horizontal"
                dataSource={items}
                loading={loading}
                locale={{ emptyText: '此目錄為空' }}
                renderItem={item => (
                    <List.Item
                        actions={[
                            <Button 
                                type="primary" 
                                size="small" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(item.path, item);
                                }}
                            >
                                {selectButtonText}
                            </Button>
                        ]}
                    >
                        <List.Item.Meta
                            avatar={
                                <FolderOpenOutlined 
                                    style={{ fontSize: 24, color: item.has_files ? '#faad14' : '#8c8c8c' }} 
                                />
                            }
                            title={
                                <a onClick={() => loadFolders(item.path)}>{item.name}</a>
                            }
                            description={
                                <span style={{ fontSize: 12, color: '#999' }}>
                                    {item.has_files ? '包含檔案' : '僅子目錄'}
                                </span>
                            }
                        />
                    </List.Item>
                )}
            />
        </div>
    </Card>
  );
};








