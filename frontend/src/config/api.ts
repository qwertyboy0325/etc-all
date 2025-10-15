// API Configuration and Mode Control

export interface ApiConfig {
  baseUrl: string;
  mode: 'mock' | 'real' | 'hybrid';
  timeout: number;
  retryAttempts: number;
}

// Default API configuration
const inferBaseUrl = (): string => {
  const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
  // If no env provided, default to relative path via same-origin reverse proxy
  let base = envBase && envBase.length > 0 ? envBase : '';
  // Normalize: ensure trailing /api/v1
  if (!base.endsWith('/api/v1')) {
    base = base.replace(/\/$/, '') + '/api/v1';
  }
  return base;
};

const defaultConfig: ApiConfig = {
  baseUrl: inferBaseUrl(),
  mode: 'real',
  timeout: 10000,
  retryAttempts: 2
};

// Global API configuration
class ApiConfigManager {
  private config: ApiConfig = { ...defaultConfig };
  private listeners: Array<(config: ApiConfig) => void> = [];

  getConfig(): ApiConfig {
    return { ...this.config };
  }

  setConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.notifyListeners();
    
    // Save to localStorage for persistence
    localStorage.setItem('api-config', JSON.stringify(this.config));
    
    console.log(`🔧 API模式已切換至: ${this.config.mode}`);
  }

  setMode(mode: 'mock' | 'real' | 'hybrid'): void {
    this.setConfig({ mode });
  }

  getMode(): 'mock' | 'real' | 'hybrid' {
    return this.config.mode;
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('api-config');
      if (stored) {
        const storedConfig = JSON.parse(stored);
        this.config = { ...defaultConfig, ...storedConfig };
        console.log(`📱 從本地存儲載入API配置: ${this.config.mode}`);
      }
    } catch (error) {
      console.warn('載入API配置失敗，使用默認配置', error);
    }
  }

  subscribe(listener: (config: ApiConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }

  // Developer tools
  enableDebugMode(): void {
    console.log('🐛 API Debug模式已啟用');
    (window as any).__ETC_API_CONFIG__ = this;
  }

  getDebugInfo() {
    return {
      config: this.config,
      listeners: this.listeners.length,
      storageKey: 'api-config'
    };
  }
}

// Global instance
export const apiConfig = new ApiConfigManager();

// Initialize from storage
apiConfig.loadFromStorage();

// Enable debug tools in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  apiConfig.enableDebugMode();
}

// Helper functions
// Mode helpers removed; always real API

// API mode descriptions
export const API_MODE_DESCRIPTIONS = {
  mock: '僅使用模擬數據，不調用真實API',
  real: '僅使用真實API，不使用模擬數據',
  hybrid: '優先使用真實API，失敗時回退到模擬數據'
};

// Export types
export type ApiMode = 'mock' | 'real' | 'hybrid'; 