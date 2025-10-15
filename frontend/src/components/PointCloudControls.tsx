import React from 'react';
import { Card, Space, Slider, ColorPicker, InputNumber, Switch, Divider, Typography, Row, Col, Select } from 'antd';
import { SettingOutlined, EyeOutlined, RotateLeftOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface PointCloudConfig {
  pointSize: number;
  pointColor: string;
  backgroundColor: string;
  showAxes: boolean;
  showGrid: boolean;
  autoRotate: boolean;
  rotationSpeed: number;
  opacity: number;
  rotationX: number; // degrees
  rotationY: number; // degrees
  rotationZ: number; // degrees
  coordinateSystem: 'y-up' | 'z-up'; // 坐標系選擇
  autoRotateNpz: boolean; // 自動旋轉NPZ文件
}

interface PointCloudControlsProps {
  config: PointCloudConfig;
  onConfigChange: (config: PointCloudConfig) => void;
  onReset?: () => void;
  onFitToView?: () => void;
  disabled?: boolean;
}

const PointCloudControls: React.FC<PointCloudControlsProps> = ({
  config,
  onConfigChange,
  onReset,
  onFitToView,
  disabled = false
}) => {
  const handleConfigChange = (key: keyof PointCloudConfig, value: any) => {
    onConfigChange({
      ...config,
      [key]: value
    });
  };

  return (
    <Card 
      title={
        <Space>
          <SettingOutlined />
          點雲配置
        </Space>
      }
      size="small"
      style={{ width: '100%' }}
      extra={
        <Space>
          {onFitToView && (
            <EyeOutlined 
              onClick={onFitToView}
              style={{ cursor: 'pointer', color: '#1890ff' }}
              title="適應視圖"
            />
          )}
          {onReset && (
            <RotateLeftOutlined 
              onClick={onReset}
              style={{ cursor: 'pointer', color: '#52c41a' }}
              title="重置配置"
            />
          )}
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* 點大小 */}
        <div>
          <Text strong>點大小</Text>
          <Row gutter={8}>
            <Col span={16}>
              <Slider
                min={0.5}
                max={10}
                step={0.1}
                value={config.pointSize}
                onChange={(value) => handleConfigChange('pointSize', value)}
                disabled={disabled}
              />
            </Col>
            <Col span={8}>
              <InputNumber
                min={0.5}
                max={10}
                step={0.1}
                value={config.pointSize}
                onChange={(value) => handleConfigChange('pointSize', value || 2)}
                disabled={disabled}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 旋轉角度 */}
        <div>
          <Text strong>旋轉</Text>
          <Row gutter={8} style={{ marginTop: 8 }}>
            <Col span={8}>
              <Text type="secondary">X</Text>
              <Slider
                min={-180}
                max={180}
                step={1}
                value={config.rotationX}
                onChange={(value) => handleConfigChange('rotationX', value)}
                disabled={disabled}
              />
            </Col>
            <Col span={8}>
              <Text type="secondary">Y</Text>
              <Slider
                min={-180}
                max={180}
                step={1}
                value={config.rotationY}
                onChange={(value) => handleConfigChange('rotationY', value)}
                disabled={disabled}
              />
            </Col>
            <Col span={8}>
              <Text type="secondary">Z</Text>
              <Slider
                min={-180}
                max={180}
                step={1}
                value={config.rotationZ}
                onChange={(value) => handleConfigChange('rotationZ', value)}
                disabled={disabled}
              />
            </Col>
          </Row>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 坐標系選擇 */}
        <div>
          <Text strong>坐標系</Text>
          <div style={{ marginTop: 4 }}>
            <Select
              value={config.coordinateSystem}
              onChange={(value) => handleConfigChange('coordinateSystem', value)}
              disabled={disabled}
              style={{ width: '100%' }}
              size="small"
            >
              <Select.Option value="y-up">Y-up (Three.js 標準)</Select.Option>
              <Select.Option value="z-up">Z-up (CAD 標準)</Select.Option>
            </Select>
          </div>
        </div>

        {/* NPZ 自動旋轉 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>自動旋轉 NPZ</Text>
            <Switch
              checked={config.autoRotateNpz}
              onChange={(checked) => handleConfigChange('autoRotateNpz', checked)}
              disabled={disabled}
              size="small"
            />
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            自動檢測並旋轉 NPZ 文件以正確顯示
          </Text>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 點顏色 */}
        <div>
          <Text strong>點顏色</Text>
          <div style={{ marginTop: 4 }}>
            <ColorPicker
              value={config.pointColor}
              onChange={(color) => handleConfigChange('pointColor', color.toHexString())}
              disabled={disabled}
              showText
              size="small"
            />
          </div>
        </div>

        {/* 背景顏色 */}
        <div>
          <Text strong>背景顏色</Text>
          <div style={{ marginTop: 4 }}>
            <ColorPicker
              value={config.backgroundColor}
              onChange={(color) => handleConfigChange('backgroundColor', color.toHexString())}
              disabled={disabled}
              showText
              size="small"
            />
          </div>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 透明度 */}
        <div>
          <Text strong>透明度</Text>
          <Row gutter={8}>
            <Col span={16}>
              <Slider
                min={0.1}
                max={1}
                step={0.1}
                value={config.opacity}
                onChange={(value) => handleConfigChange('opacity', value)}
                disabled={disabled}
              />
            </Col>
            <Col span={8}>
              <InputNumber
                min={0.1}
                max={1}
                step={0.1}
                value={config.opacity}
                onChange={(value) => handleConfigChange('opacity', value || 1)}
                disabled={disabled}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 顯示選項 */}
        <div>
          <Text strong>顯示選項</Text>
          <div style={{ marginTop: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>顯示坐標軸</Text>
                <Switch
                  checked={config.showAxes}
                  onChange={(checked) => handleConfigChange('showAxes', checked)}
                  disabled={disabled}
                  size="small"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>顯示網格</Text>
                <Switch
                  checked={config.showGrid}
                  onChange={(checked) => handleConfigChange('showGrid', checked)}
                  disabled={disabled}
                  size="small"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>自動旋轉</Text>
                <Switch
                  checked={config.autoRotate}
                  onChange={(checked) => handleConfigChange('autoRotate', checked)}
                  disabled={disabled}
                  size="small"
                />
              </div>
            </Space>
          </div>
        </div>

        {/* 旋轉速度 */}
        {config.autoRotate && (
          <div>
            <Text strong>旋轉速度</Text>
            <Row gutter={8}>
              <Col span={16}>
                <Slider
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={config.rotationSpeed}
                  onChange={(value) => handleConfigChange('rotationSpeed', value)}
                  disabled={disabled}
                />
              </Col>
              <Col span={8}>
                <InputNumber
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={config.rotationSpeed}
                  onChange={(value) => handleConfigChange('rotationSpeed', value || 1)}
                  disabled={disabled}
                  style={{ width: '100%' }}
                />
              </Col>
            </Row>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default PointCloudControls;
