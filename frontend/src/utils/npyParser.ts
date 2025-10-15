/**
 * NPY文件解析工具
 * 用於解析numpy格式的點雲文件
 */

export interface NpyHeader {
  shape: number[];
  fortran_order: boolean;
  dtype: string;
}

export interface ParsedNpyData {
  data: Float32Array;
  shape: number[];
  header: NpyHeader;
}

/**
 * 解析NPY文件頭部
 */
function parseNpyHeader(buffer: ArrayBuffer): { header: NpyHeader; dataOffset: number } {
  const uint8 = new Uint8Array(buffer);
  
  // 檢查魔術字 - NPY文件以 \x93NUMPY 開頭
  const magicBytes = uint8.slice(0, 6);
  const magicString = String.fromCharCode(...magicBytes);
  
  if (magicString !== '\x93NUMPY') {
    // 嘗試檢查是否為有效的NPY魔術字
    const expectedMagic = [0x93, 0x4E, 0x55, 0x4D, 0x50, 0x59]; // \x93NUMPY
    const isMagicValid = expectedMagic.every((byte, index) => magicBytes[index] === byte);
    
    if (!isMagicValid) {
      throw new Error('Invalid NPY file: missing magic number');
    }
  }
  
  // 讀取版本信息
  const version = uint8[6];
  const minorVersion = uint8[7];
  
  let headerLength: number;
  let headerBytes: Uint8Array;
  
  if (version === 1) {
    // Version 1.x
    headerLength = new DataView(buffer.slice(8, 10)).getUint16(0, true);
    headerBytes = uint8.slice(10, 10 + headerLength);
  } else if (version === 2) {
    // Version 2.x
    headerLength = new DataView(buffer.slice(8, 12)).getUint32(0, true);
    headerBytes = uint8.slice(12, 12 + headerLength);
  } else {
    throw new Error(`Unsupported NPY version: ${version}.${minorVersion}`);
  }
  
  // 提取純頭部字符串（去除數據部分）
  const headerStr = extractHeaderString(headerBytes);
  const header = parseHeaderString(headerStr);
  
  const dataOffset = version === 1 ? 10 + headerLength : 12 + headerLength;
  
  return { header, dataOffset };
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
function parseHeaderString(headerStr: string): NpyHeader {
  // 移除結尾的換行符和空格
  headerStr = headerStr.replace(/\n+$/, '').trim();
  
  console.log('Raw header string:', headerStr);
  
  // 清理頭部字符串，只保留字典部分
  const cleanHeader = headerStr.split('}')[0] + '}';
  console.log('Clean header:', cleanHeader);
  
  // 實際格式: {'descr': '<f4', 'fortran_order': False, 'shape': (5000, 3), }
  
  // 提取descr (數據類型)
  const descrMatch = cleanHeader.match(/descr['"]?\s*:\s*['"]([^'"]+)['"]/);
  if (!descrMatch) {
    console.error('Could not find descr in header:', cleanHeader);
    throw new Error('Invalid NPY header format: missing descr');
  }
  const dtype = descrMatch[1];
  
  // 提取fortran_order
  const fortranMatch = cleanHeader.match(/fortran_order\s*:\s*(True|False)/);
  const fortran_order = fortranMatch ? fortranMatch[1] === 'True' : false;
  
  // 提取shape - 修復正則表達式以正確匹配Python元組
  const shapeMatch = cleanHeader.match(/shape\s*:\s*\(([^)]+)\)/);
  if (!shapeMatch) {
    console.error('Could not find shape in header:', cleanHeader);
    console.error('Shape regex test:', cleanHeader.match(/shape\s*:\s*\(/));
    // 嘗試更寬鬆的匹配
    const looseMatch = cleanHeader.match(/shape\s*:\s*\(([^)]+)\)/);
    console.error('Loose match:', looseMatch);
    
    // 手動解析shape
    const shapeStart = cleanHeader.indexOf("'shape': (");
    if (shapeStart !== -1) {
      const shapeEnd = cleanHeader.indexOf(')', shapeStart);
      if (shapeEnd !== -1) {
        const shapeContent = cleanHeader.substring(shapeStart + 10, shapeEnd);
        console.log('Manual shape extraction:', shapeContent);
        const shape = shapeContent
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .map(s => parseInt(s));
        
        console.log('Manual parsed header:', { dtype, fortran_order, shape });
        return { shape, fortran_order, dtype };
      }
    }
    
    throw new Error('Invalid NPY header format: missing shape');
  }
  
  const shapeStr = shapeMatch[1];
  console.log('Shape string:', shapeStr);
  
  const shape = shapeStr
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => parseInt(s));
  
  console.log('Parsed header:', { dtype, fortran_order, shape });
  
  return { shape, fortran_order, dtype };
}

/**
 * 解析NPY文件數據
 */
export function parseNpyFile(buffer: ArrayBuffer): ParsedNpyData {
  const { header, dataOffset } = parseNpyHeader(buffer);
  
  // 檢查數據類型
  if (!header.dtype.includes('f4') && !header.dtype.includes('f8')) {
    throw new Error(`Unsupported data type: ${header.dtype}. Only float32/float64 supported.`);
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
  const bytesPerElement = isFloat64 ? 8 : 4;
  
  for (let i = 0; i < totalElements; i++) {
    const offset = i * bytesPerElement;
    if (isFloat64) {
      data[i] = dataView.getFloat64(offset, true); // little-endian
    } else {
      data[i] = dataView.getFloat32(offset, true); // little-endian
    }
  }
  
  return { data, shape: header.shape, header };
}

/**
 * 計算點雲邊界
 */
export function calculateBounds(positions: Float32Array): {
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

/**
 * 點雲取樣（用於大文件優化）
 */
export function samplePointCloud(
  positions: Float32Array, 
  sampleRate: number = 0.1
): Float32Array {
  if (sampleRate >= 1.0) {
    return positions;
  }
  
  const totalPoints = positions.length / 3;
  const sampledCount = Math.floor(totalPoints * sampleRate);
  const sampledPositions = new Float32Array(sampledCount * 3);
  
  const step = 1 / sampleRate;
  
  for (let i = 0; i < sampledCount; i++) {
    const sourceIndex = Math.floor(i * step) * 3;
    sampledPositions[i * 3] = positions[sourceIndex];
    sampledPositions[i * 3 + 1] = positions[sourceIndex + 1];
    sampledPositions[i * 3 + 2] = positions[sourceIndex + 2];
  }
  
  return sampledPositions;
} 