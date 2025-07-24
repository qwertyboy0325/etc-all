import React, { useRef, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stats, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { Card, Spin, Alert, Typography, Space, Statistic, Button, Slider } from 'antd'
import { RotateCcw, Maximize } from 'lucide-react'
import * as THREE from 'three'

const { Text } = Typography

// Point cloud data interface
interface PointCloudData {
  positions: Float32Array
  colors?: Float32Array
  pointCount: number
  bounds: {
    min: [number, number, number]
    max: [number, number, number]
  }
}

// Point cloud props
interface PointCloudProps {
  data: PointCloudData
  pointSize: number
  showColors: boolean
}

// Point Cloud Mesh Component
const PointCloud: React.FC<PointCloudProps> = ({ data, pointSize, showColors }) => {
  const meshRef = useRef<THREE.Points>(null)
  
  // Create geometry from point cloud data
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
  
  if (showColors && data.colors) {
    geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
  }
  
  // Create material
  const material = new THREE.PointsMaterial({
    size: pointSize,
    vertexColors: showColors && data.colors ? true : false,
    color: showColors && data.colors ? 0xffffff : 0x00ff88,
    sizeAttenuation: true,
  })

  useFrame(() => {
    if (meshRef.current) {
      // Optional: Add subtle rotation animation
      // meshRef.current.rotation.y += 0.001
    }
  })

  return (
    <points ref={meshRef} geometry={geometry} material={material} />
  )
}

// Scene setup component
const Scene: React.FC<{ 
  data: PointCloudData | null
  pointSize: number 
  showColors: boolean
  showGrid: boolean
}> = ({ data, pointSize, showColors, showGrid }) => {
  if (!data) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    )
  }

  // Calculate scene center and scale
  const center = [
    (data.bounds.min[0] + data.bounds.max[0]) / 2,
    (data.bounds.min[1] + data.bounds.max[1]) / 2,
    (data.bounds.min[2] + data.bounds.max[2]) / 2,
  ]

  const scale = Math.max(
    data.bounds.max[0] - data.bounds.min[0],
    data.bounds.max[1] - data.bounds.min[1],
    data.bounds.max[2] - data.bounds.min[2]
  )

  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.6} />
      
      {/* Directional light */}
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      
      {/* Point cloud */}
      <group position={[-center[0], -center[1], -center[2]]}>
        <PointCloud 
          data={data} 
          pointSize={pointSize}
          showColors={showColors}
        />
      </group>
      
      {/* Grid helper */}
      {showGrid && (
        <Grid 
          args={[scale * 2, scale * 2]} 
          cellSize={scale / 10} 
          cellThickness={0.5}
          sectionSize={scale / 2}
          sectionThickness={1}
          fadeDistance={scale * 3}
          fadeStrength={1}
        />
      )}
    </>
  )
}

// Main Point Cloud Viewer Component
interface PointCloudViewerProps {
  data: PointCloudData | null
  loading?: boolean
  error?: string
  title?: string
}

const PointCloudViewer: React.FC<PointCloudViewerProps> = ({ 
  data, 
  loading = false, 
  error,
  title = "點雲查看器"
}) => {
  const [pointSize, setPointSize] = useState(2)
  const [showColors, setShowColors] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showStats, setShowStats] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleReset = () => {
    setPointSize(2)
    setShowColors(true)
    setShowGrid(true)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (loading) {
    return (
      <Card>
        <div style={{ 
          height: '400px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Spin size="large" />
          <Text style={{ marginLeft: '16px' }}>正在載入點雲數據...</Text>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Alert
          message="載入錯誤"
          description={error}
          type="error"
          showIcon
        />
      </Card>
    )
  }

  const viewerStyle = {
    height: isFullscreen ? '100vh' : '600px',
    width: '100%',
    position: isFullscreen ? 'fixed' as const : 'relative' as const,
    top: isFullscreen ? 0 : 'auto',
    left: isFullscreen ? 0 : 'auto',
    zIndex: isFullscreen ? 1000 : 'auto',
    background: '#f0f2f5'
  }

  return (
    <Card 
      title={title}
      style={{ width: '100%' }}
      extra={
        <Space>
          <Button 
            icon={<RotateCcw size={16} />}
            onClick={handleReset}
            size="small"
          >
            重置
          </Button>
          <Button 
            icon={<Maximize size={16} />}
            onClick={toggleFullscreen}
            size="small"
          >
            {isFullscreen ? '退出全屏' : '全屏'}
          </Button>
        </Space>
      }
    >
      {/* Controls Panel */}
      <div style={{ marginBottom: '16px' }}>
        <Space wrap>
          <div>
            <Text strong>點大小: </Text>
            <Slider 
              style={{ width: 120, display: 'inline-block', marginLeft: 8 }}
              min={0.5}
              max={10}
              step={0.5}
              value={pointSize}
              onChange={setPointSize}
            />
            <Text style={{ marginLeft: 8 }}>{pointSize}</Text>
          </div>
          
          <Button 
            type={showColors ? 'primary' : 'default'}
            size="small"
            onClick={() => setShowColors(!showColors)}
          >
            {showColors ? '隱藏顏色' : '顯示顏色'}
          </Button>
          
          <Button 
            type={showGrid ? 'primary' : 'default'}
            size="small"
            onClick={() => setShowGrid(!showGrid)}
          >
            {showGrid ? '隱藏網格' : '顯示網格'}
          </Button>
          
          <Button 
            type={showStats ? 'primary' : 'default'}
            size="small"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? '隱藏統計' : '顯示統計'}
          </Button>
        </Space>
      </div>

      {/* Stats Panel */}
      {data && (
        <div style={{ marginBottom: '16px' }}>
          <Space split={<div style={{ margin: '0 8px', borderLeft: '1px solid #d9d9d9' }} />}>
            <Statistic title="點數量" value={data.pointCount.toLocaleString()} />
            <Statistic 
              title="範圍 X" 
              value={`${data.bounds.min[0].toFixed(2)} ~ ${data.bounds.max[0].toFixed(2)}`}
              valueStyle={{ fontSize: '14px' }}
            />
            <Statistic 
              title="範圍 Y" 
              value={`${data.bounds.min[1].toFixed(2)} ~ ${data.bounds.max[1].toFixed(2)}`}
              valueStyle={{ fontSize: '14px' }}
            />
            <Statistic 
              title="範圍 Z" 
              value={`${data.bounds.min[2].toFixed(2)} ~ ${data.bounds.max[2].toFixed(2)}`}
              valueStyle={{ fontSize: '14px' }}
            />
          </Space>
        </div>
      )}

      {/* 3D Viewer */}
      <div style={viewerStyle}>
        <Canvas
          camera={{ 
            position: [50, 50, 50], 
            fov: 60,
            near: 0.1,
            far: 1000 
          }}
          style={{ background: 'linear-gradient(to bottom, #87CEEB 0%, #E0F6FF 100%)' }}
        >
          <Suspense fallback={null}>
            <Scene 
              data={data}
              pointSize={pointSize / 100} // Scale for Three.js
              showColors={showColors}
              showGrid={showGrid}
            />
            
            {/* Controls */}
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              dampingFactor={0.05}
              enableDamping={true}
            />
            
            {/* Gizmo */}
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
              <GizmoViewport axisColors={['red', 'green', 'blue']} labelColor="black" />
            </GizmoHelper>
            
            {/* Performance stats */}
            {showStats && <Stats />}
          </Suspense>
        </Canvas>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
        <Text type="secondary">
          💡 使用滑鼠拖拽旋轉視角，滾輪縮放，右鍵拖拽平移視角
        </Text>
      </div>
    </Card>
  )
}

export default PointCloudViewer 