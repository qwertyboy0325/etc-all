import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Card, Button, Space, Tooltip, Typography } from 'antd';
import {
  RotateLeftOutlined
} from '@ant-design/icons';

const { Text } = Typography;

// Helper to create circular texture
function createCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (context) {
    context.beginPath();
    context.arc(16, 16, 14, 0, 2 * Math.PI);
    context.fillStyle = 'white';
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Types
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
  width?: number | string;
  height?: number | string;
  showStats?: boolean;
}

// Point Cloud Component
interface PointCloudProps {
  data: Float32Array;
  annotations: AnnotationData[];
  pointSize: number;
}

const PointCloud: React.FC<PointCloudProps> = ({
  data,
  annotations,
  pointSize
}) => {
  const meshRef = useRef<THREE.Points>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry>();
  const [material, setMaterial] = useState<THREE.PointsMaterial>();
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
      // Default to Green to match reference
      colors[i * 3] = 0.0;     // R
      colors[i * 3 + 1] = 1.0; // G
      colors[i * 3 + 2] = 0.5; // B
    }
    newGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const newMaterial = new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: true,
      sizeAttenuation: false, // Use screen space size (pixels)
      map: createCircleTexture(),
      alphaTest: 0.5,
      transparent: true
    });

    setGeometry(newGeometry);
    setMaterial(newMaterial);

    return () => {
      newGeometry.dispose();
      newMaterial.dispose();
    };
  }, [data]);

  // Update material size when pointSize changes
  useEffect(() => {
    if (material) {
        material.size = pointSize;
        material.needsUpdate = true;
    }
  }, [pointSize, material]);

  // Update colors based on annotations
  useEffect(() => {
    if (!geometry) return;

    const colorAttribute = geometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttribute.array as Float32Array;
    const pointCount = colors.length / 3;

    // Reset all colors to default (Green)
    for (let i = 0; i < pointCount; i++) {
      colors[i * 3] = 0.0;     // R
      colors[i * 3 + 1] = 1.0; // G
      colors[i * 3 + 2] = 0.5; // B
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

    colorAttribute.needsUpdate = true;
  }, [geometry, annotations]);

  if (!geometry || !material) {
    return null;
  }

  return (
    <points
      ref={meshRef}
      geometry={geometry}
      material={material}
    />
  );
};

// Controls Component
interface ControlsProps {
  onResetView: () => void;
  pointSize: number;
  setPointSize: (size: number) => void;
}

const ViewerControls: React.FC<ControlsProps> = ({
  onResetView,
  pointSize,
  setPointSize
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
        
        <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>點大小: {pointSize}px</Text>
            <input 
                type="range" 
                min="1" 
                max="10" 
                step="0.5" 
                value={pointSize} 
                onChange={(e) => setPointSize(parseFloat(e.target.value))}
                style={{ width: '100%' }}
            />
        </div>
      </Space>
    </div>
  );
};

// Main Component
const AnnotationViewer: React.FC<AnnotationViewerProps> = ({
  pointCloudData,
  annotations = [],
  width = 800,
  height = 600,
  showStats = true
}) => {
  const controlsRef = useRef<any>(null);
  const [pointSize, setPointSize] = useState<number>(2); // Default 2 pixels

  const handleResetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  // Calculate bounds and center
  const { center } = useMemo(() => {
    if (!pointCloudData || pointCloudData.length === 0) {
      return { center: [0, 0, 0] };
    }
    
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < pointCloudData.length; i += 3) {
      const x = pointCloudData[i];
      const y = pointCloudData[i + 1];
      const z = pointCloudData[i + 2];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    
    return {
        center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2]
    };
  }, [pointCloudData]);

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
        camera={{ position: [0, 0, 50], fov: 60 }} // Increased distance
        style={{ width: '100%', height: '100%', background: 'black' }} // Set black background
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        
        {/* Center the group and apply rotation */}
        <group rotation={[0, 0, -Math.PI / 2]}>
          <group position={[-center[0], -center[1], -center[2]]}>
              <PointCloud
                data={pointCloudData}
                annotations={annotations}
                pointSize={pointSize}
              />
          </group>
        </group>
        
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
        />
      </Canvas>

      <ViewerControls
        onResetView={handleResetView}
        pointSize={pointSize}
        setPointSize={setPointSize}
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
        </div>
      )}
    </div>
  );
};

export default AnnotationViewer; 