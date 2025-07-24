import React, { useState, useEffect } from 'react';
import { 
  Select, 
  Space, 
  Tooltip, 
  Typography, 
  Card, 
  Divider,
  Badge,
  Button
} from 'antd';
import { 
  ApiOutlined, 
  CloudOutlined, 
  DatabaseOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { apiConfig, API_MODE_DESCRIPTIONS, type ApiMode } from '../config/api';

const { Text } = Typography;
const { Option } = Select;

interface ApiModeSwitchProps {
  showCard?: boolean;
  size?: 'small' | 'middle' | 'large';
}

const ApiModeSwitch: React.FC<ApiModeSwitchProps> = ({ 
  showCard = false,
  size = 'middle' 
}) => {
  const [currentMode, setCurrentMode] = useState<ApiMode>(apiConfig.getMode());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Subscribe to config changes
    const unsubscribe = apiConfig.subscribe((config) => {
      setCurrentMode(config.mode);
    });

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleModeChange = (mode: ApiMode) => {
    apiConfig.setMode(mode);
  };

  const getModeIcon = (mode: ApiMode) => {
    switch (mode) {
      case 'real': return <CloudOutlined style={{ color: '#52c41a' }} />;
      case 'mock': return <DatabaseOutlined style={{ color: '#1890ff' }} />;
      case 'hybrid': return <ApiOutlined style={{ color: '#fa8c16' }} />;
    }
  };

  const getModeColor = (mode: ApiMode) => {
    switch (mode) {
      case 'real': return '#52c41a';
      case 'mock': return '#1890ff';
      case 'hybrid': return '#fa8c16';
    }
  };

  const getStatusBadge = () => {
    if (!isOnline) {
      return <Badge status="error" text="離線" />;
    }
    
    switch (currentMode) {
      case 'real':
        return <Badge status="success" text="真實API" />;
      case 'mock':
        return <Badge status="processing" text="模擬數據" />;
      case 'hybrid':
        return <Badge status="warning" text="混合模式" />;
    }
  };

  const testApiConnection = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/system/health');
      if (response.ok) {
        console.log('✅ API連接測試成功');
      } else {
        console.warn('⚠️ API連接測試失敗');
      }
    } catch (error) {
      console.error('❌ API連接測試錯誤:', error);
    }
  };

  const switchContent = (
    <Space direction="vertical" size="small">
      <Space>
        {getModeIcon(currentMode)}
        <Text strong>API模式</Text>
        {getStatusBadge()}
      </Space>
      
      <Select
        value={currentMode}
        onChange={handleModeChange}
        style={{ width: '100%', minWidth: 150 }}
        size={size}
      >
        <Option value="hybrid">
          <Space>
            <ApiOutlined style={{ color: '#fa8c16' }} />
            混合模式
          </Space>
        </Option>
        <Option value="real">
          <Space>
            <CloudOutlined style={{ color: '#52c41a' }} />
            真實API
          </Space>
        </Option>
        <Option value="mock">
          <Space>
            <DatabaseOutlined style={{ color: '#1890ff' }} />
            模擬數據
          </Space>
        </Option>
      </Select>

      <Text 
        type="secondary" 
        style={{ fontSize: '12px', display: 'block' }}
      >
        {API_MODE_DESCRIPTIONS[currentMode]}
      </Text>

      {currentMode === 'real' && (
        <Button 
          size="small" 
          onClick={testApiConnection}
          icon={<InfoCircleOutlined />}
        >
          測試連接
        </Button>
      )}
    </Space>
  );

  if (showCard) {
    return (
      <Card 
        title={
          <Space>
            <SettingOutlined />
            <span>API配置</span>
          </Space>
        }
        size="small"
        style={{ width: 280 }}
      >
        {switchContent}
        
        <Divider style={{ margin: '12px 0' }} />
        
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '12px' }}>狀態信息:</Text>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: '11px' }}>網路狀態:</Text>
            <Badge 
              status={isOnline ? "success" : "error"} 
              text={isOnline ? "在線" : "離線"} 
            />
          </Space>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: '11px' }}>當前模式:</Text>
            <Text 
              style={{ 
                fontSize: '11px', 
                color: getModeColor(currentMode),
                fontWeight: 'bold'
              }}
            >
              {currentMode.toUpperCase()}
            </Text>
          </Space>
        </Space>
      </Card>
    );
  }

  return (
    <Tooltip title="切換API模式" placement="bottom">
      <div style={{ cursor: 'pointer' }}>
        {switchContent}
      </div>
    </Tooltip>
  );
};

export default ApiModeSwitch; 