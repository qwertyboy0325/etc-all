import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Card, Button, Space, Tooltip, message, Typography } from 'antd';
import {
  EyeOutlined,
  SelectOutlined,
  ClearOutlined,
  RotateLeftOutlined
} from '@ant-design/icons';

const { Text } = Typography;

// Types
interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface SelectedPoints {
  indices: number[];
  coordinates: Point3D[];
}

interface AnnotationData {
  id: string;
  vehicleType: string;
  confidence: number;
  points: number[];
  color: string;
  visible: boolean;
}

interface AnnotationViewerProps {
  pointCloudData?: Float32Array;
  annotations?: AnnotationData[];
  isSelectionMode?: boolean;
  selectedPoints?: SelectedPoints;
  onPointsSelect?: (points: SelectedPoints) => void;
  onAnnotationClick?: (annotation: AnnotationData) => void;
  width?: number | string;
  height?: number | string;
  showStats?: boolean;
}

// Point Cloud Component
interface PointCloudProps {
  data: Float32Array;
  annotations: AnnotationData[];
  isSelectionMode: boolean;
  selectedPoints: SelectedPoints;
  onPointsSelect: (points: SelectedPoints) => void;
  onAnnotationClick: (annotation: AnnotationData) => void;
}

const PointCloud: React.FC<PointCloudProps> = ({
  data,
  annotations,
  isSelectionMode,
  selectedPoints,
  onPointsSelect,
  onAnnotationClick: _onAnnotationClick
}) => {
  const meshRef = useRef<THREE.Points>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry>();
  const [material, setMaterial] = useState<THREE.PointsMaterial>();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const { camera, gl } = useThree();

  // Initialize geometry and material
  useEffect(() => {
    if (!data || data.length === 0) return;

    const pointCount = data.length / 3;
    const newGeometry = new THREE.BufferGeometry();
    
    // Set positions
    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(data, 3));
    
    // Set colors
    const colors = new Float32Array(pointCount * 3);
    for (let i = 0; i < pointCount; i++) {
      colors[i * 3] = 0.7;     // R
      colors[i * 3 + 1] = 0.7; // G
      colors[i * 3 + 2] = 0.7; // B
    }
    newGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const newMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      sizeAttenuation: true
    });

    setGeometry(newGeometry);
    setMaterial(newMaterial);

    return () => {
      newGeometry.dispose();
      newMaterial.dispose();
    };
  }, [data]);

  // Update colors based on selection and annotations
  useEffect(() => {
    if (!geometry) return;

    const colorAttribute = geometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttribute.array as Float32Array;
    const pointCount = colors.length / 3;

    // Reset all colors to default
    for (let i = 0; i < pointCount; i++) {
      colors[i * 3] = 0.7;     // R
      colors[i * 3 + 1] = 0.7; // G
      colors[i * 3 + 2] = 0.7; // B
    }

    // Apply annotation colors
    annotations.forEach(annotation => {
      if (!annotation.visible) return;
      
      const color = new THREE.Color(annotation.color);
      annotation.points.forEach(pointIndex => {
        if (pointIndex < pointCount) {
          colors[pointIndex * 3] = color.r;
          colors[pointIndex * 3 + 1] = color.g;
          colors[pointIndex * 3 + 2] = color.b;
        }
      });
    });

    // Highlight selected points
    selectedPoints.indices.forEach(pointIndex => {
      if (pointIndex < pointCount) {
        colors[pointIndex * 3] = 1.0;     // R - bright red for selection
        colors[pointIndex * 3 + 1] = 0.2; // G
        colors[pointIndex * 3 + 2] = 0.2; // B
      }
    });

    colorAttribute.needsUpdate = true;
  }, [geometry, annotations, selectedPoints]);

  // Handle point selection
  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!isSelectionMode || !geometry || !meshRef.current) return;

    event.stopPropagation();
    
    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.nativeEvent.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.nativeEvent.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, camera);
    
    const intersects = raycaster.current.intersectObject(meshRef.current);
    
    if (intersects.length > 0) {
      const intersection = intersects[0];
      const pointIndex = intersection.index || 0;
      
      // Get point coordinates
      const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
      const x = positionAttribute.getX(pointIndex);
      const y = positionAttribute.getY(pointIndex);
      const z = positionAttribute.getZ(pointIndex);

      // Toggle point selection
      const newSelectedIndices = [...selectedPoints.indices];
      const newSelectedCoords = [...selectedPoints.coordinates];
      
      const existingIndex = newSelectedIndices.indexOf(pointIndex);
      if (existingIndex >= 0) {
        // Remove point
        newSelectedIndices.splice(existingIndex, 1);
        newSelectedCoords.splice(existingIndex, 1);
      } else {
        // Add point
        newSelectedIndices.push(pointIndex);
        newSelectedCoords.push({ x, y, z });
      }

      onPointsSelect({
        indices: newSelectedIndices,
        coordinates: newSelectedCoords
      });
    }
  }, [isSelectionMode, geometry, selectedPoints, onPointsSelect, camera, gl]);

  if (!geometry || !material) {
    return null;
  }

  return (
    <points
      ref={meshRef}
      geometry={geometry}
      material={material}
      onClick={handleClick}
    />
  );
};

// Selection Box Component
const SelectionBox: React.FC<{ selectedPoints: SelectedPoints }> = ({ selectedPoints }) => {
  if (selectedPoints.coordinates.length < 2) return null;

  const positions: number[] = [];
  selectedPoints.coordinates.forEach(point => {
    positions.push(point.x, point.y, point.z);
  });

  return (
    <Line
      points={positions}
      color="red"
      lineWidth={2}
    />
  );
};

// Controls Component
interface ControlsProps {
  isSelectionMode: boolean;
  onToggleSelection: () => void;
  onClearSelection: () => void;
  onResetView: () => void;
  selectedCount: number;
}

const ViewerControls: React.FC<ControlsProps> = ({
  isSelectionMode,
  onToggleSelection,
  onClearSelection,
  onResetView,
  selectedCount
}) => {
  return (
    <div style={{ 
      position: 'absolute', 
      top: 16, 
      left: 16, 
      zIndex: 10,
      background: 'rgba(255, 255, 255, 0.9)',
      padding: 12,
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <Space direction="vertical" size="small">
        <Space wrap>
          <Tooltip title={isSelectionMode ? "切換到瀏覽模式" : "切換到選點模式"}>
            <Button
              type={isSelectionMode ? "primary" : "default"}
              icon={isSelectionMode ? <SelectOutlined /> : <EyeOutlined />}
              onClick={onToggleSelection}
              size="small"
            >
              {isSelectionMode ? "選點模式" : "瀏覽模式"}
            </Button>
          </Tooltip>

          <Tooltip title="清空選擇">
            <Button
              icon={<ClearOutlined />}
              onClick={onClearSelection}
              disabled={selectedCount === 0}
              size="small"
            >
              清空
            </Button>
          </Tooltip>

          <Tooltip title="重置視角">
            <Button
              icon={<RotateLeftOutlined />}
              onClick={onResetView}
              size="small"
            >
              重置
            </Button>
          </Tooltip>
        </Space>

        {selectedCount > 0 && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            已選擇 {selectedCount} 個點
          </Text>
        )}
      </Space>
    </div>
  );
};

// Main Component
const AnnotationViewer: React.FC<AnnotationViewerProps> = ({
  pointCloudData,
  annotations = [],
  isSelectionMode = false,
  selectedPoints = { indices: [], coordinates: [] },
  onPointsSelect,
  onAnnotationClick,
  width = 800,
  height = 600,
  showStats = true
}) => {
  const [selectionMode, setSelectionMode] = useState(isSelectionMode);
  const [currentSelected, setCurrentSelected] = useState<SelectedPoints>(selectedPoints);
  const controlsRef = useRef<any>();

  // Update selection mode
  useEffect(() => {
    setSelectionMode(isSelectionMode);
  }, [isSelectionMode]);

  // Update selected points
  useEffect(() => {
    setCurrentSelected(selectedPoints);
  }, [selectedPoints]);

  // Handle points selection
  const handlePointsSelect = useCallback((points: SelectedPoints) => {
    setCurrentSelected(points);
    if (onPointsSelect) {
      onPointsSelect(points);
    }
  }, [onPointsSelect]);

  // Toggle selection mode
  const handleToggleSelection = useCallback(() => {
    setSelectionMode(!selectionMode);
  }, [selectionMode]);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    const emptySelection = { indices: [], coordinates: [] };
    setCurrentSelected(emptySelection);
    if (onPointsSelect) {
      onPointsSelect(emptySelection);
    }
    message.info('已清空選擇');
  }, [onPointsSelect]);

  // Reset view
  const handleResetView = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  if (!pointCloudData || pointCloudData.length === 0) {
    return (
      <Card style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text type="secondary">暫無點雲數據</Text>
      </Card>
    );
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        
        <PointCloud
          data={pointCloudData}
          annotations={annotations}
          isSelectionMode={selectionMode}
          selectedPoints={currentSelected}
          onPointsSelect={handlePointsSelect}
          onAnnotationClick={onAnnotationClick || (() => {})}
        />
        
        <SelectionBox selectedPoints={currentSelected} />
        
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          enableZoom={!selectionMode}
          enablePan={!selectionMode}
          enableRotate={!selectionMode}
        />
      </Canvas>

      <ViewerControls
        isSelectionMode={selectionMode}
        onToggleSelection={handleToggleSelection}
        onClearSelection={handleClearSelection}
        onResetView={handleResetView}
        selectedCount={currentSelected.indices.length}
      />

      {showStats && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: 8,
          borderRadius: 4,
          fontSize: '12px'
        }}>
          <div>點數: {Math.floor(pointCloudData.length / 3).toLocaleString()}</div>
          <div>標注: {annotations.length}</div>
          <div>已選: {currentSelected.indices.length}</div>
        </div>
      )}
    </div>
  );
};

export default AnnotationViewer; 