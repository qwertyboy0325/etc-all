import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { parseNpyFile, calculateBounds } from '../utils/npyParser';
import { parseNpzFile, extractPointCloudFromNpz } from '../utils/npzParser';
import { PointCloudConfig } from './PointCloudControls';

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
  config?: Partial<PointCloudConfig>;
  // 向後兼容的舊屬性
  backgroundColor?: string;
  pointSize?: number;
  pointColor?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export interface PointCloudRendererRef {
  loadFromArrayBuffer: (buffer: ArrayBuffer) => Promise<void>;
  loadFromUrl: (url: string) => Promise<void>;
  fitToView: () => void;
  updateConfig: (config: Partial<PointCloudConfig>) => void;
}

export const PointCloudRenderer = forwardRef<PointCloudRendererRef, PointCloudRendererProps>(({
  data,
  width = 800,
  height = 600,
  config,
  backgroundColor = '#000000',
  pointSize = 2,
  pointColor = '#ffffff',
  onLoad,
  onError
}, ref) => {
  // 合併配置，優先使用 config 中的值
  const mergedConfig: PointCloudConfig = {
    pointSize: config?.pointSize ?? pointSize,
    pointColor: config?.pointColor ?? pointColor,
    backgroundColor: config?.backgroundColor ?? backgroundColor,
    showAxes: config?.showAxes ?? true,
    showGrid: config?.showGrid ?? false,
    autoRotate: config?.autoRotate ?? false,
    rotationSpeed: config?.rotationSpeed ?? 1,
    opacity: config?.opacity ?? 1,
    rotationX: config?.rotationX ?? 0,
    rotationY: config?.rotationY ?? 0,
    rotationZ: config?.rotationZ ?? 0,
    coordinateSystem: config?.coordinateSystem ?? 'y-up',
    autoRotateNpz: config?.autoRotateNpz ?? true,
  };
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const pivotRef = useRef<THREE.Group | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasFramedRef = useRef(false);

  // 初始化Three.js場景
  const initScene = useCallback(() => {
    if (!mountRef.current) return;

    // 創建場景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(mergedConfig.backgroundColor);
    // 根據配置設定坐標系
    if (mergedConfig.coordinateSystem === 'z-up') {
      scene.up.set(0, 0, 1); // Z-up
    } else {
      scene.up.set(0, 1, 0); // Y-up (Three.js 標準)
    }
    sceneRef.current = scene;

    // 創建相機
    // 優先使用容器尺寸，若不可用則回退到 props
    const containerWidth = mountRef.current.clientWidth || width;
    const containerHeight = mountRef.current.clientHeight || height;
    const camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 1000);
    // 根據配置設定相機坐標系
    if (mergedConfig.coordinateSystem === 'z-up') {
      camera.up.set(0, 0, 1); // Z-up
      camera.position.set(0, -5, 5); // 從右後方看向原點
      camera.lookAt(0, 0, 0);
    } else {
      camera.up.set(0, 1, 0); // Y-up
      camera.position.set(0, 0, 5);
    }
    cameraRef.current = camera;

    // 創建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerWidth, containerHeight);
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

    // 添加坐標軸
    if (mergedConfig.showAxes) {
      const axesHelper = new THREE.AxesHelper(1);
      scene.add(axesHelper);
    }

    // 添加網格
    if (mergedConfig.showGrid) {
      const gridHelper = new THREE.GridHelper(10, 10);
      gridHelper.name = 'gridHelper';
      // 根據坐標系設定網格位置
      if (mergedConfig.coordinateSystem === 'z-up') {
        // Z-up：網格在 XY 平面（Z=0）
        gridHelper.rotation.x = Math.PI / 2;
      }
      // Y-up：網格在 XZ 平面（Y=0），無需旋轉
      scene.add(gridHelper);
    }

    // 添加方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.name = 'directionalLight';
    // 根據坐標系設定光照位置
    if (mergedConfig.coordinateSystem === 'z-up') {
      directionalLight.position.set(1, -1, 1); // Z-up：從右後上方照射
    } else {
      directionalLight.position.set(1, 1, 1); // Y-up：從右上方照射
    }
    scene.add(directionalLight);

    // 創建 pivot 群組（作為旋轉樞紐）
    const pivot = new THREE.Group();
    scene.add(pivot);
    pivotRef.current = pivot;

    // 動畫循環
    const animate = () => {
      requestAnimationFrame(animate);
      
      // 自動旋轉（繞 pivot）
      if (mergedConfig.autoRotate && pivotRef.current) {
        pivotRef.current.rotation.y += mergedConfig.rotationSpeed * 0.01;
      }
      
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [width, height]);

  // 載入點雲數據
  const loadPointCloud = useCallback((pointCloudData: PointCloudData) => {
    if (!sceneRef.current) return;

    setIsLoading(true);

    try {
      // 移除現有的點雲
      if (pointsRef.current) {
        if (pivotRef.current) pivotRef.current.remove(pointsRef.current);
        pointsRef.current.geometry.dispose();
        if (pointsRef.current.material instanceof THREE.ShaderMaterial) {
          pointsRef.current.material.dispose();
        } else if (pointsRef.current.material instanceof THREE.PointsMaterial) {
          pointsRef.current.material.dispose();
        }
      }

      // 創建幾何體
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(pointCloudData.positions, 3));
      // 計算 pivot 平移（始終以邊界中心作為樞紐：移動 Points，使 pivot 在原點）
      const b = pointCloudData.bounds;
      const cx = (b.min[0] + b.max[0]) / 2;
      const cy = (b.min[1] + b.max[1]) / 2;
      const cz = (b.min[2] + b.max[2]) / 2;
      
      // 添加大小屬性
      const sizes = new Float32Array(pointCloudData.pointCount);
      const colors = new Float32Array(pointCloudData.pointCount * 3);
      
      const color = new THREE.Color(mergedConfig.pointColor);
      for (let i = 0; i < pointCloudData.pointCount; i++) {
        sizes[i] = mergedConfig.pointSize;
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // 創建自定義著色器材質 - 確保顯示為真正的圓形點（螢幕空間大小）
      const vertexShader = `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size; // 螢幕空間大小，不受3D距離影響
          gl_Position = projectionMatrix * mvPosition;
        }
      `;

      const fragmentShader = `
        uniform vec3 pointColor;
        uniform float opacity;
        varying vec3 vColor;
        
        void main() {
          // 創建圓形點
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) {
            discard; // 丟棄圓形外的像素
          }
          
          // 創建柔和的邊緣
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          
          gl_FragColor = vec4(vColor * pointColor, alpha * opacity);
        }
      `;

      const material = new THREE.ShaderMaterial({
        uniforms: {
          pointColor: { value: new THREE.Color(mergedConfig.pointColor) },
          opacity: { value: mergedConfig.opacity }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        blending: THREE.NormalBlending,
        depthTest: true,
        depthWrite: false
      });

      // 創建點雲對象
      const points = new THREE.Points(geometry, material);
      // 將點雲位置偏移，使其幾何中心對齊 pivot(0,0,0)
      points.position.set(-cx, -cy, -cz);
      // 應用初始旋轉到 pivot（角度 -> 弧度）
      if (pivotRef.current) {
        pivotRef.current.rotation.x = (mergedConfig.rotationX * Math.PI) / 180;
        pivotRef.current.rotation.y = (mergedConfig.rotationY * Math.PI) / 180;
        pivotRef.current.rotation.z = (mergedConfig.rotationZ * Math.PI) / 180;
        pivotRef.current.add(points);
      } else {
        sceneRef.current.add(points);
      }
      pointsRef.current = points;

      // 調整相機位置到點雲中心（僅首次自動框選）
      if (cameraRef.current && !hasFramedRef.current) {
        const center = [0, 0, 0] as [number, number, number];
        const size = Math.max(...pointCloudData.bounds.size);
        
        cameraRef.current.position.set(
          center[0] + size * 2,
          center[1] + size * 2,
          center[2] + size * 2
        );
        cameraRef.current.lookAt(center[0], center[1], center[2]);
        cameraRef.current.updateProjectionMatrix();
        hasFramedRef.current = true;
      }

      // 僅首次重置控制器目標
      if (controlsRef.current && !hasFramedRef.current) {
        controlsRef.current.target.set(0, 0, 0);
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

      let pointCloudData: PointCloudData;

      // 檢查文件格式並解析
      const uint8 = new Uint8Array(buffer);
      
      // 檢查是否為NPZ文件（ZIP格式）
      const isZip = uint8[0] === 0x50 && uint8[1] === 0x4B; // PK (ZIP magic)
      
      if (isZip) {
        // 解析NPZ文件
        console.log('Detected NPZ file, parsing...');
        const npzData = await parseNpzFile(buffer);
        const extractedData = extractPointCloudFromNpz(npzData, mergedConfig.autoRotateNpz);
        
        pointCloudData = {
          positions: extractedData.positions,
          pointCount: extractedData.pointCount,
          bounds: extractedData.bounds
        };
        
        console.log(`NPZ file parsed: ${extractedData.pointCount} points, bounds:`, extractedData.bounds);
      } else {
        // 解析NPY文件
        console.log('Detected NPY file, parsing...');
        const parsedData = parseNpyFile(buffer);
        
        // 檢查數據格式
        if (parsedData.shape.length !== 2 || parsedData.shape[1] !== 3) {
          throw new Error('Invalid point cloud format: expected (N, 3) shape');
        }

        // 計算邊界
        const bounds = calculateBounds(parsedData.data);

        pointCloudData = {
          positions: parsedData.data,
          pointCount: parsedData.shape[0],
          bounds
        };
        
        console.log(`NPY file parsed: ${parsedData.shape[0]} points, bounds:`, bounds);
      }

      // 載入到渲染器
      loadPointCloud(pointCloudData);

    } catch (error) {
      setIsLoading(false);
      console.error('Failed to parse point cloud file:', error);
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

  // 適應視圖
  const fitToView = useCallback(() => {
    if (pointsRef.current && controlsRef.current && cameraRef.current) {
      const box = new THREE.Box3().setFromObject(pointsRef.current);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = cameraRef.current.fov * (Math.PI / 180);
      let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraDistance *= 1.5; // 添加一些邊距
      
      // 根據坐標系設定相機位置
      if (mergedConfig.coordinateSystem === 'z-up') {
        // Z-up：相機從右後方看向中心
        cameraRef.current.position.set(
          center.x, 
          center.y - cameraDistance, 
          center.z + cameraDistance
        );
      } else {
        // Y-up：相機從前方看向中心
        cameraRef.current.position.set(
          center.x, 
          center.y, 
          center.z + cameraDistance
        );
      }
      
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [mergedConfig.coordinateSystem]);

  // 更新配置
  const updateConfig = useCallback((newConfig: Partial<PointCloudConfig>) => {
    // 這裡可以添加配置更新的邏輯
    console.log('Config updated:', newConfig);
  }, []);

  // 暴露方法給父組件
  useImperativeHandle(ref, () => ({
    loadFromArrayBuffer,
    loadFromUrl,
    fitToView,
    updateConfig
  }), [loadFromArrayBuffer, loadFromUrl, fitToView, updateConfig]);

  // 初始化場景
  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [initScene]);

  // 監聽坐標系變更，重新初始化場景
  useEffect(() => {
    if (sceneRef.current && cameraRef.current) {
      // 更新場景坐標系
      if (mergedConfig.coordinateSystem === 'z-up') {
        sceneRef.current.up.set(0, 0, 1);
        cameraRef.current.up.set(0, 0, 1);
        cameraRef.current.position.set(0, -5, 5);
        cameraRef.current.lookAt(0, 0, 0);
      } else {
        sceneRef.current.up.set(0, 1, 0);
        cameraRef.current.up.set(0, 1, 0);
        cameraRef.current.position.set(0, 0, 5);
      }

      // 更新網格
      const gridHelper = sceneRef.current.getObjectByName('gridHelper');
      if (gridHelper) {
        if (mergedConfig.coordinateSystem === 'z-up') {
          gridHelper.rotation.x = Math.PI / 2;
        } else {
          gridHelper.rotation.x = 0;
        }
      }

      // 更新光照
      const directionalLight = sceneRef.current.getObjectByName('directionalLight');
      if (directionalLight) {
        if (mergedConfig.coordinateSystem === 'z-up') {
          directionalLight.position.set(1, -1, 1);
        } else {
          directionalLight.position.set(1, 1, 1);
        }
      }

      // 更新控制器
      if (controlsRef.current) {
        controlsRef.current.update();
      }
    }
  }, [mergedConfig.coordinateSystem]);

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

  // 監聽容器尺寸，讓渲染器自適應
  useEffect(() => {
    if (!mountRef.current) return;

    const el = mountRef.current;
    const resize = () => {
      const w = el.clientWidth || width;
      const h = el.clientHeight || height;
      if (!rendererRef.current || !cameraRef.current) return;
      rendererRef.current.setSize(w, h, false);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };

    const ResizeObs = (window as any).ResizeObserver;
    const ro = ResizeObs ? new ResizeObs(() => resize()) : undefined;
    // 若瀏覽器不支持 ResizeObserver，退化為 window resize
    if (ro) {
      ro.observe(el);
    } else {
      window.addEventListener('resize', resize);
    }
    // 初始執行一次
    resize();

    return () => {
      if (ro) {
        ro.unobserve(el);
        ro.disconnect?.();
      } else {
        window.removeEventListener('resize', resize);
      }
    };
  }, [width, height]);

  // 僅更新背景顏色，避免整個場景重建
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(mergedConfig.backgroundColor);
    }
  }, [mergedConfig.backgroundColor]);

  // 依配置更新點大小 / 顏色 / 透明度（不重建物件）
  useEffect(() => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry as THREE.BufferGeometry;
    const sizeAttr = geom.getAttribute('size') as THREE.BufferAttribute | undefined;
    if (sizeAttr) {
      for (let i = 0; i < sizeAttr.count; i++) {
        sizeAttr.setX(i, mergedConfig.pointSize);
      }
      sizeAttr.needsUpdate = true;
    }

    const material = pointsRef.current.material as THREE.ShaderMaterial | undefined;
    if (material && material.uniforms) {
      if (material.uniforms.pointColor) {
        material.uniforms.pointColor.value = new THREE.Color(mergedConfig.pointColor);
      }
      if (material.uniforms.opacity) {
        material.uniforms.opacity.value = mergedConfig.opacity;
      }
    }
  }, [mergedConfig.pointSize, mergedConfig.pointColor, mergedConfig.opacity]);

  // 對外：當旋轉配置變更時，立即更新點雲旋轉
  useEffect(() => {
    if (!pivotRef.current) return;
    pivotRef.current.rotation.x = (mergedConfig.rotationX * Math.PI) / 180;
    pivotRef.current.rotation.y = (mergedConfig.rotationY * Math.PI) / 180;
    pivotRef.current.rotation.z = (mergedConfig.rotationZ * Math.PI) / 180;
  }, [mergedConfig.rotationX, mergedConfig.rotationY, mergedConfig.rotationZ]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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

PointCloudRenderer.displayName = 'PointCloudRenderer';

export default PointCloudRenderer; 