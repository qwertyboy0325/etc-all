import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { parseNpyFile, calculateBounds } from '../utils/npyParser';

export interface PointCloudData {
  positions: Float32Array;
  pointCount: number;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    size: [number, number, number];
  };
}

interface PointCloudRendererProps {
  data: PointCloudData | null;
  width?: number;
  height?: number;
  backgroundColor?: string;
  pointSize?: number;
  pointColor?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export interface PointCloudRendererRef {
  loadFromArrayBuffer: (buffer: ArrayBuffer) => Promise<void>;
  loadFromUrl: (url: string) => Promise<void>;
}

export const PointCloudRenderer = forwardRef<PointCloudRendererRef, PointCloudRendererProps>(({
  data,
  width = 800,
  height = 600,
  backgroundColor = '#000000',
  pointSize = 2,
  pointColor = '#ffffff',
  onLoad,
  onError
}, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 初始化Three.js場景
  const initScene = useCallback(() => {
    if (!mountRef.current) return;

    // 創建場景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    // 創建相機
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // 創建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 創建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.1;
    controls.maxDistance = 100;
    controlsRef.current = controls;

    // 添加環境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // 添加方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // 動畫循環
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [width, height, backgroundColor]);

  // 載入點雲數據
  const loadPointCloud = useCallback((pointCloudData: PointCloudData) => {
    if (!sceneRef.current) return;

    setIsLoading(true);

    try {
      // 移除現有的點雲
      if (pointsRef.current) {
        sceneRef.current.remove(pointsRef.current);
        pointsRef.current.geometry.dispose();
        (pointsRef.current.material as THREE.PointsMaterial).dispose();
      }

      // 創建幾何體
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(pointCloudData.positions, 3));

      // 創建材質
      const material = new THREE.PointsMaterial({
        color: pointColor,
        size: pointSize,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8
      });

      // 創建點雲對象
      const points = new THREE.Points(geometry, material);
      sceneRef.current.add(points);
      pointsRef.current = points;

      // 調整相機位置到點雲中心
      if (cameraRef.current) {
        const bounds = pointCloudData.bounds;
        const center = bounds.center;
        const size = Math.max(...bounds.size);
        
        cameraRef.current.position.set(
          center[0] + size * 2,
          center[1] + size * 2,
          center[2] + size * 2
        );
        cameraRef.current.lookAt(center[0], center[1], center[2]);
        cameraRef.current.updateProjectionMatrix();
      }

      // 重置控制器
      if (controlsRef.current) {
        controlsRef.current.target.set(
          pointCloudData.bounds.center[0],
          pointCloudData.bounds.center[1],
          pointCloudData.bounds.center[2]
        );
        controlsRef.current.update();
      }

      setIsLoading(false);
      onLoad?.();

    } catch (error) {
      setIsLoading(false);
      onError?.(error instanceof Error ? error.message : 'Failed to load point cloud');
    }
  }, [pointColor, pointSize, onLoad, onError]);

  // 從ArrayBuffer載入點雲
  const loadFromArrayBuffer = useCallback(async (buffer: ArrayBuffer) => {
    try {
      setIsLoading(true);

      // 解析NPY文件
      const parsedData = parseNpyFile(buffer);
      
      // 檢查數據格式
      if (parsedData.shape.length !== 2 || parsedData.shape[1] !== 3) {
        throw new Error('Invalid point cloud format: expected (N, 3) shape');
      }

      // 計算邊界
      const bounds = calculateBounds(parsedData.data);

      // 創建點雲數據對象
      const pointCloudData: PointCloudData = {
        positions: parsedData.data,
        pointCount: parsedData.shape[0],
        bounds
      };

      // 載入到渲染器
      loadPointCloud(pointCloudData);

    } catch (error) {
      setIsLoading(false);
      onError?.(error instanceof Error ? error.message : 'Failed to parse point cloud file');
    }
  }, [loadPointCloud, onError]);

  // 從URL載入點雲
  const loadFromUrl = useCallback(async (url: string) => {
    try {
      setIsLoading(true);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      await loadFromArrayBuffer(buffer);

    } catch (error) {
      setIsLoading(false);
      onError?.(error instanceof Error ? error.message : 'Failed to load point cloud from URL');
    }
  }, [loadFromArrayBuffer, onError]);

  // 暴露方法給父組件
  useImperativeHandle(ref, () => ({
    loadFromArrayBuffer,
    loadFromUrl
  }), [loadFromArrayBuffer, loadFromUrl]);

  // 初始化場景
  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [initScene]);

  // 載入數據
  useEffect(() => {
    if (data) {
      loadPointCloud(data);
    }
  }, [data, loadPointCloud]);

  // 清理
  useEffect(() => {
    return () => {
      if (pointsRef.current) {
        pointsRef.current.geometry.dispose();
        (pointsRef.current.material as THREE.PointsMaterial).dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width, height }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
          zIndex: 1000
        }}>
          載入中...
        </div>
      )}
    </div>
  );
}); 