import axios from 'axios'
import { apiConfig } from '../config/api'

// API base URL - 由配置推斷
const API_BASE_URL = apiConfig.getConfig().baseUrl

// Point cloud data interface
export interface PointCloudData {
  positions: Float32Array
  colors?: Float32Array
  pointCount: number
  bounds: {
    min: [number, number, number]
    max: [number, number, number]
  }
}

// Point cloud file info from backend
export interface PointCloudFileInfo {
  id: string
  original_filename: string
  file_size: number
  status: string
  point_count: number | null
  dimensions: number | null
  min_x: string | null
  max_x: string | null
  min_y: string | null
  max_y: string | null
  min_z: string | null
  max_z: string | null
  upload_completed_at: string | null
  created_at: string
}

// Generate sample point cloud data for demo
export function generateSamplePointCloud(pointCount: number = 10000): PointCloudData {
  const positions = new Float32Array(pointCount * 3)
  const colors = new Float32Array(pointCount * 3)
  
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity
  
  for (let i = 0; i < pointCount; i++) {
    const i3 = i * 3
    
    // Generate random points in a sphere-like distribution
    const radius = Math.random() * 50
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)
    
    positions[i3] = x
    positions[i3 + 1] = y
    positions[i3 + 2] = z
    
    // Update bounds
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
    
    // Generate colors based on height (Z coordinate)
    const normalizedZ = (z + 50) / 100 // Normalize to 0-1
    colors[i3] = normalizedZ // Red channel
    colors[i3 + 1] = 1 - normalizedZ // Green channel
    colors[i3 + 2] = 0.5 // Blue channel
  }
  
  return {
    positions,
    colors,
    pointCount,
    bounds: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ]
    }
  }
}

// Load point cloud data from backend API
export async function loadPointCloudFromAPI(
  projectId: string, 
  fileId: string,
  authToken: string
): Promise<PointCloudData> {
  try {
    // First get file info
    const fileInfoResponse = await axios.get<PointCloudFileInfo>(
      `${API_BASE_URL}/projects/${projectId}/files/${fileId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    )
    
    const fileInfo = fileInfoResponse.data
    
    // Get download URL
    const downloadResponse = await axios.get<{ download_url: string }>(
      `${API_BASE_URL}/projects/${projectId}/files/${fileId}/download`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    )
    
    // Download the actual point cloud data
    const dataResponse = await axios.get(downloadResponse.data.download_url, {
      responseType: 'arraybuffer'
    })
    
    // Parse the numpy array data
    const pointCloudData = parseNumpyArray(new Uint8Array(dataResponse.data))
    
    // Extract bounds from file info if available
    const bounds = extractBoundsFromFileInfo(fileInfo)
    
    return {
      ...pointCloudData,
      bounds
    }
  } catch (error) {
    console.error('Error loading point cloud:', error)
    throw new Error('Failed to load point cloud data')
  }
}

// Parse numpy array data (simplified - real implementation would need proper .npy parser)
function parseNumpyArray(data: Uint8Array): Omit<PointCloudData, 'bounds'> {
  // This is a simplified implementation
  // In a real application, you would use a proper .npy parser library
  // like 'numpy-js' or implement the full .npy format specification
  
  // For now, assume the data is already in the correct format
  // and extract positions (and colors if available)
  
  // Skip .npy header (simplified)
  const headerEndIndex = findNumpyHeaderEnd(data)
  const arrayData = data.slice(headerEndIndex)
  
  // Convert to Float32Array
  const float32Data = new Float32Array(arrayData.buffer, arrayData.byteOffset)
  
  // Assume XYZ data (3 components per point)
  const pointCount = Math.floor(float32Data.length / 3)
  const positions = float32Data.slice(0, pointCount * 3)
  
  // Check if there are colors (RGB) - assumes XYZRGB format
  let colors: Float32Array | undefined
  if (float32Data.length >= pointCount * 6) {
    colors = float32Data.slice(pointCount * 3, pointCount * 6)
    // Normalize colors to 0-1 range if they're in 0-255 range
    for (let i = 0; i < colors.length; i++) {
      if (colors[i] > 1) {
        colors[i] = colors[i] / 255
      }
    }
  }
  
  return {
    positions,
    colors,
    pointCount
  }
}

// Helper function to find numpy header end (simplified)
function findNumpyHeaderEnd(data: Uint8Array): number {
  // Look for the end of the numpy header
  // This is a simplified implementation
  // Real .npy files have a specific header format
  
  // Magic string: 0x93NUMPY
  for (let i = 0; i < data.length - 10; i++) {
    if (data[i] === 0x93 && 
        data[i + 1] === 0x4E && // 'N'
        data[i + 2] === 0x55 && // 'U'
        data[i + 3] === 0x4D && // 'M'
        data[i + 4] === 0x50 && // 'P'
        data[i + 5] === 0x59) { // 'Y'
      // Found header, look for data start
      // Skip version and header length
      const headerLength = data[i + 8] | (data[i + 9] << 8)
      return i + 10 + headerLength
    }
  }
  
  // Fallback: assume no header (raw float data)
  return 0
}

// Extract bounds from file info
function extractBoundsFromFileInfo(fileInfo: PointCloudFileInfo): {
  min: [number, number, number]
  max: [number, number, number]
} {
  const minX = fileInfo.min_x ? parseFloat(fileInfo.min_x) : -50
  const maxX = fileInfo.max_x ? parseFloat(fileInfo.max_x) : 50
  const minY = fileInfo.min_y ? parseFloat(fileInfo.min_y) : -50
  const maxY = fileInfo.max_y ? parseFloat(fileInfo.max_y) : 50
  const minZ = fileInfo.min_z ? parseFloat(fileInfo.min_z) : -50
  const maxZ = fileInfo.max_z ? parseFloat(fileInfo.max_z) : 50
  
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ]
  }
}

// Get project files list
export async function getProjectFiles(
  projectId: string,
  authToken: string
): Promise<PointCloudFileInfo[]> {
  try {
    const response = await axios.get<{ files: PointCloudFileInfo[] }>(
      `${API_BASE_URL}/projects/${projectId}/files`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    )
    
    return response.data.files
  } catch (error) {
    console.error('Error loading project files:', error)
    throw new Error('Failed to load project files')
  }
}

// Upload point cloud file
export async function uploadPointCloudFile(
  projectId: string,
  file: File,
  authToken: string,
  onProgress?: (progress: number) => void
): Promise<PointCloudFileInfo> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await axios.post<PointCloudFileInfo>(
      `${API_BASE_URL}/projects/${projectId}/files/upload`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100
            onProgress(progress)
          }
        }
      }
    )
    
    return response.data
  } catch (error) {
    console.error('Error uploading point cloud file:', error)
    throw new Error('Failed to upload point cloud file')
  }
} 