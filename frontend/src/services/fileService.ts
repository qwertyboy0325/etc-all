/**
 * 文件服務
 * 用於從API獲取文件列表和載入文件
 */
import { API_BASE_URL, getAuthHeaders } from '../utils/api';

export interface FileInfo {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  upload_completed_at: string | null;
  created_at: string;
}

export interface FileListResponse {
  items: FileInfo[];
  total: number;
}

export interface FileUploadResponse {
  file_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  status: string;
  point_count?: number;
  checksum?: string;
  message?: string;
}

/**
 * 從API獲取文件列表
 */
export async function getFileList(): Promise<FileInfo[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/files`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Authentication required. Please login first.');
        throw new Error('請先登入以查看文件列表');
      }
      const errorText = await response.text();
      console.error(`API Error ${response.status}:`, errorText);
      throw new Error(`載入文件列表失敗: HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('File list loaded:', data);
    return Array.isArray(data) ? data : data.items || [];
  } catch (error) {
    console.error('Failed to fetch file list:', error);
    throw error;
  }
}

/**
 * 從API下載文件
 */
export async function downloadFile(fileId: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}/download`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized');
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Failed to download file:', error);
    throw error;
  }
}

/**
 * 上傳文件到API
 */
export async function uploadFile(file: File): Promise<FileInfo> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      // Important: Do NOT set Content-Type here; let browser set multipart boundary
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      body: formData
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized');
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to upload file:', error);
    throw error;
  }
}

/**
 * 專案：上傳單一點雲文件（.npy/.npz/.ply/.pcd）
 */
export async function uploadProjectFile(projectId: string, file: File, description?: string): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (description) formData.append('description', description);
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/files/upload`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    body: formData
  });
  if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);
  return await res.json();
}

/**
 * 專案：批量上傳點雲文件（多檔）
 */
export async function uploadProjectFiles(projectId: string, files: File[]): Promise<FileUploadResponse[]> {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/files/upload-multi`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    body: formData
  });
  if (!res.ok) throw new Error(`Upload multi failed: HTTP ${res.status}`);
  return await res.json();
}

/**
 * 專案：上傳ZIP（包含多個 npy/npz）
 */
export async function uploadProjectArchive(projectId: string, zipFile: File): Promise<FileUploadResponse[]> {
  const formData = new FormData();
  formData.append('archive', zipFile);
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/files/upload-archive`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    body: formData
  });
  if (!res.ok) throw new Error(`Upload archive failed: HTTP ${res.status}`);
  return await res.json();
}

/**
 * 生成示例文件
 */
export async function generateSampleFiles(): Promise<{ message: string; files: string[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/system/generate-sample-npy`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized');
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to generate sample files:', error);
    throw error;
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * 驗證文件格式
 */
export function validateFileFormat(filename: string): boolean {
  const validExtensions = ['.npy', '.npz'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(extension);
} 