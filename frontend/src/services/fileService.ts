/**
 * 文件服務
 * 用於從API獲取文件列表和載入文件
 */

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

/**
 * 從API獲取文件列表
 */
export async function getFileList(): Promise<FileInfo[]> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('http://localhost:8000/api/v1/files', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
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
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`http://localhost:8000/api/v1/files/${fileId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
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
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:8000/api/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to upload file:', error);
    throw error;
  }
}

/**
 * 生成示例文件
 */
export async function generateSampleFiles(): Promise<{ message: string; files: string[] }> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('http://localhost:8000/api/v1/system/generate-sample-npy', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
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