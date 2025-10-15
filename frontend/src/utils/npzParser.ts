/**
 * NPZ文件解析工具
 * 用於解析NumPy壓縮格式的點雲文件
 */

export interface NpzData {
  [key: string]: ArrayBuffer;
}

export interface ParsedNpzData {
  data: Float32Array;
  shape: number[];
  metadata: {
    [key: string]: any;
  };
  pointCloudKey?: string;
}

/**
 * 解析NPZ文件
 */
export async function parseNpzFile(buffer: ArrayBuffer): Promise<ParsedNpzData> {
  // 使用Python的numpy格式解析
  // NPZ文件是ZIP格式，包含多個.npy文件
  
  try {
    // 創建ZIP解析器
    const JSZip = (await import('jszip')).default;
    const zipFile = await JSZip.loadAsync(buffer);
    
    const npzData: NpzData = {};
    const metadata: { [key: string]: any } = {};
    let pointCloudKey: string | undefined;
    let pointCloudData: Float32Array | undefined;
    let pointCloudShape: number[] | undefined;
    
    // 解析所有文件
    for (const [filename, file] of Object.entries(zipFile.files)) {
      if (!file.dir) {
        const content = await file.async('arraybuffer');
        npzData[filename] = content;
        
        // 嘗試解析為NumPy數組
        try {
          const npyData = parseNpyFromBuffer(content);
          metadata[filename] = {
            shape: npyData.shape,
            dtype: npyData.dtype,
            isNumeric: npyData.isNumeric
          };
          
          // 檢查是否為點雲數據（3D點雲通常是 Nx3 的形狀）
          if (npyData.isNumeric && npyData.shape.length === 2 && npyData.shape[1] >= 3) {
            pointCloudKey = filename;
            pointCloudData = npyData.data;
            pointCloudShape = npyData.shape;
          }
        } catch (e) {
          // 如果不是NumPy格式，可能是字符串或其他數據
          try {
            const text = await file.async('text');
            metadata[filename] = { value: text, type: 'string' };
          } catch (textError) {
            metadata[filename] = { type: 'binary', size: content.byteLength };
          }
        }
      }
    }
    
    if (!pointCloudData || !pointCloudShape) {
      throw new Error('No valid point cloud data found in NPZ file');
    }
    
    return {
      data: pointCloudData,
      shape: pointCloudShape,
      metadata,
      pointCloudKey
    };
    
  } catch (error) {
    console.error('Failed to parse NPZ file:', error);
    throw new Error(`Failed to parse NPZ file: ${error}`);
  }
}

/**
 * 從緩衝區解析NumPy數組
 */
function parseNpyFromBuffer(buffer: ArrayBuffer): {
  data: Float32Array;
  shape: number[];
  dtype: string;
  isNumeric: boolean;
} {
  const uint8 = new Uint8Array(buffer);
  
  // 檢查NPY魔術字
  const magicBytes = uint8.slice(0, 6);
  const expectedMagic = [0x93, 0x4E, 0x55, 0x4D, 0x50, 0x59]; // \x93NUMPY
  const isMagicValid = expectedMagic.every((byte, index) => magicBytes[index] === byte);
  
  if (!isMagicValid) {
    throw new Error('Invalid NPY file: missing magic number');
  }
  
  // 讀取版本信息
  const version = uint8[6];
  const minorVersion = uint8[7];
  
  let headerLength: number;
  let headerBytes: Uint8Array;
  
  if (version === 1) {
    headerLength = new DataView(buffer.slice(8, 10)).getUint16(0, true);
    headerBytes = uint8.slice(10, 10 + headerLength);
  } else if (version === 2) {
    headerLength = new DataView(buffer.slice(8, 12)).getUint32(0, true);
    headerBytes = uint8.slice(12, 12 + headerLength);
  } else {
    throw new Error(`Unsupported NPY version: ${version}.${minorVersion}`);
  }
  
  // 解析頭部
  const headerStr = extractHeaderString(headerBytes);
  const header = parseHeaderString(headerStr);
  
  const dataOffset = version === 1 ? 10 + headerLength : 12 + headerLength;
  
  // 檢查數據類型
  const isNumeric = header.dtype.includes('f') || header.dtype.includes('i') || header.dtype.includes('u');
  
  if (!isNumeric) {
    throw new Error(`Non-numeric data type: ${header.dtype}`);
  }
  
  // 提取數據部分
  const dataBuffer = buffer.slice(dataOffset);
  const dataView = new DataView(dataBuffer);
  
  // 計算總元素數
  const totalElements = header.shape.reduce((a, b) => a * b, 1);
  
  // 創建Float32Array
  const data = new Float32Array(totalElements);
  
  // 讀取數據
  const isFloat64 = header.dtype.includes('f8');
  const isFloat32 = header.dtype.includes('f4');
  const isInt32 = header.dtype.includes('i4');
  const isInt64 = header.dtype.includes('i8');
  
  for (let i = 0; i < totalElements; i++) {
    const offset = i * 4; // 統一使用4字節讀取
    
    if (isFloat64) {
      // 對於float64，需要特殊處理
      const float64Offset = i * 8;
      data[i] = dataView.getFloat64(float64Offset, true);
    } else if (isFloat32) {
      data[i] = dataView.getFloat32(offset, true);
    } else if (isInt32) {
      data[i] = dataView.getInt32(offset, true);
    } else if (isInt64) {
      data[i] = dataView.getInt32(offset, true); // 轉換為32位
    } else {
      // 默認嘗試讀取為float32
      data[i] = dataView.getFloat32(offset, true);
    }
  }
  
  return {
    data,
    shape: header.shape,
    dtype: header.dtype,
    isNumeric
  };
}

/**
 * 從頭部字節中提取純頭部字符串
 */
function extractHeaderString(headerBytes: Uint8Array): string {
  const decoder = new TextDecoder();
  const fullHeader = decoder.decode(headerBytes);
  
  // 查找字典的結束位置
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  let endPos = 0;
  
  for (let i = 0; i < fullHeader.length; i++) {
    const char = fullHeader[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' || char === "'") {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endPos = i + 1;
          break;
        }
      }
    }
  }
  
  if (endPos === 0) {
    throw new Error('Invalid NPY header: could not find end of dictionary');
  }
  
  return fullHeader.substring(0, endPos);
}

/**
 * 解析頭部字符串
 */
function parseHeaderString(headerStr: string): {
  shape: number[];
  fortran_order: boolean;
  dtype: string;
} {
  // 移除結尾的換行符和空格
  headerStr = headerStr.replace(/\n+$/, '').trim();
  
  // 清理頭部字符串，只保留字典部分
  const cleanHeader = headerStr.split('}')[0] + '}';
  
  // 提取descr (數據類型)
  const descrMatch = cleanHeader.match(/descr['"]?\s*:\s*['"]([^'"]+)['"]/);
  if (!descrMatch) {
    throw new Error('Invalid NPY header format: missing descr');
  }
  const dtype = descrMatch[1];
  
  // 提取fortran_order
  const fortranMatch = cleanHeader.match(/fortran_order\s*:\s*(True|False)/);
  const fortran_order = fortranMatch ? fortranMatch[1] === 'True' : false;
  
  // 提取shape
  const shapeMatch = cleanHeader.match(/shape\s*:\s*\(([^)]+)\)/);
  if (!shapeMatch) {
    // 嘗試手動解析shape
    const shapeStart = cleanHeader.indexOf("'shape': (");
    if (shapeStart !== -1) {
      const shapeEnd = cleanHeader.indexOf(')', shapeStart);
      if (shapeEnd !== -1) {
        const shapeContent = cleanHeader.substring(shapeStart + 10, shapeEnd);
        const shape = shapeContent
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .map(s => parseInt(s));
        
        return { shape, fortran_order, dtype };
      }
    }
    
    throw new Error('Invalid NPY header format: missing shape');
  }
  
  const shapeStr = shapeMatch[1];
  const shape = shapeStr
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => parseInt(s));
  
  return { shape, fortran_order, dtype };
}

/**
 * 從NPZ數據中提取點雲數據
 */
export function extractPointCloudFromNpz(npzData: ParsedNpzData, autoRotate: boolean = true): {
  positions: Float32Array;
  pointCount: number;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    size: [number, number, number];
  };
} {
  const { data, shape } = npzData;
  
  if (shape.length !== 2 || shape[1] < 3) {
    throw new Error('Invalid point cloud shape: expected (N, 3) or (N, 4+)');
  }
  
  const pointCount = shape[0];
  const positions = new Float32Array(pointCount * 3);
  
  // 提取前3列作為XYZ坐標
  // 原始座標直接映射
  for (let i = 0; i < pointCount; i++) {
    positions[i * 3] = data[i * shape[1]];     // X
    positions[i * 3 + 1] = data[i * shape[1] + 1]; // Y
    positions[i * 3 + 2] = data[i * shape[1] + 2]; // Z
  }
  
  // 根據配置決定是否應用自動旋轉
  const transformedPositions = autoRotate 
    ? autoDetectAndTransformCoordinates(positions)
    : positions;
  
  // 計算邊界
  const bounds = calculateBounds(transformedPositions);
  
  return {
    positions: transformedPositions,
    pointCount,
    bounds
  };
}

/**
 * 從NPZ文件緩衝區直接提取點雲數據（用於沒有配置的組件）
 * 默認啟用自動旋轉
 */
export async function extractPointCloudFromNpzBuffer(buffer: ArrayBuffer): Promise<{
  positions: Float32Array;
  pointCount: number;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    size: [number, number, number];
  };
}> {
  const npzData = await parseNpzFile(buffer);
  return extractPointCloudFromNpz(npzData, true); // 默認啟用自動旋轉
}

/**
 * 自動檢測並轉換坐標系
 * 許多點雲數據需要旋轉才能正確顯示
 */
function autoDetectAndTransformCoordinates(positions: Float32Array): Float32Array {
  const pointCount = positions.length / 3;
  // 第一步：Z-up -> Y-up（固定繞 X 軸 -90 度）
  const step1 = new Float32Array(positions.length);
  for (let i = 0; i < pointCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    step1[i * 3] = x;      // X 保持
    step1[i * 3 + 1] = -z; // Y = -Z
    step1[i * 3 + 2] = y;  // Z = Y
  }

  // 第二步：依據資料慣例，繞 Z 軸 -90 度（使 X'=Y, Y'=-X），修正水平朝向
  const step2 = new Float32Array(positions.length);
  for (let i = 0; i < pointCount; i++) {
    const x1 = step1[i * 3];
    const y1 = step1[i * 3 + 1];
    const z1 = step1[i * 3 + 2];
    step2[i * 3] = y1;      // X' = Y
    step2[i * 3 + 1] = -x1; // Y' = -X
    step2[i * 3 + 2] = z1;  // Z' = Z
  }

  return step2;
}

/**
 * 計算點雲邊界
 */
function calculateBounds(positions: Float32Array): {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
} {
  if (positions.length < 3) {
    throw new Error('Invalid point cloud data: need at least 1 point');
  }
  
  let minX = positions[0];
  let minY = positions[1];
  let minZ = positions[2];
  let maxX = positions[0];
  let maxY = positions[1];
  let maxZ = positions[2];
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  
  const center: [number, number, number] = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2
  ];
  
  const size: [number, number, number] = [
    maxX - minX,
    maxY - minY,
    maxZ - minZ
  ];
  
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center,
    size
  };
}
