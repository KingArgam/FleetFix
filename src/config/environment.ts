// Environment configuration for FleetFix backend integration

export interface EnvironmentConfig {
  API_BASE_URL: string;
  WS_URL: string;
  AUTH_ENABLED: boolean;
  DEBUG_MODE: boolean;
  API_TIMEOUT: number;
  MAX_RETRY_ATTEMPTS: number;
  UPLOAD_MAX_SIZE: number;
  FEATURES: {
    REAL_TIME_UPDATES: boolean;
    AUDIT_LOGGING: boolean;
    FILE_UPLOADS: boolean;
    BULK_OPERATIONS: boolean;
    CSV_EXPORT: boolean;
    CSV_IMPORT: boolean;
  };
  NOTIFICATIONS: {
    // Email functionality removed - only push notifications supported
  };
}

// Development environment (local development)
const developmentConfig: EnvironmentConfig = {
  API_BASE_URL: 'http://localhost:3001/api',
  WS_URL: 'ws://localhost:3001/ws',
  AUTH_ENABLED: true,
  DEBUG_MODE: true,
  API_TIMEOUT: 10000, // 10 seconds
  MAX_RETRY_ATTEMPTS: 3,
  UPLOAD_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  FEATURES: {
    REAL_TIME_UPDATES: true,
    AUDIT_LOGGING: true,
    FILE_UPLOADS: true,
    BULK_OPERATIONS: true,
    CSV_EXPORT: true,
    CSV_IMPORT: true,
  },
  NOTIFICATIONS: {
    // Email functionality removed - only push notifications supported
  },
};

// Staging environment
const stagingConfig: EnvironmentConfig = {
  API_BASE_URL: 'https://api-staging.fleetfix.com/api',
  WS_URL: 'wss://api-staging.fleetfix.com/ws',
  AUTH_ENABLED: true,
  DEBUG_MODE: false,
  API_TIMEOUT: 15000, // 15 seconds
  MAX_RETRY_ATTEMPTS: 3,
  UPLOAD_MAX_SIZE: 25 * 1024 * 1024, // 25MB
  FEATURES: {
    REAL_TIME_UPDATES: true,
    AUDIT_LOGGING: true,
    FILE_UPLOADS: true,
    BULK_OPERATIONS: true,
    CSV_EXPORT: true,
    CSV_IMPORT: true,
  },
  NOTIFICATIONS: {
    // Email functionality removed - only push notifications supported
  }
};

// Production environment
const productionConfig: EnvironmentConfig = {
  API_BASE_URL: 'https://api.fleetfix.com/api',
  WS_URL: 'wss://api.fleetfix.com/ws',
  AUTH_ENABLED: true,
  DEBUG_MODE: false,
  API_TIMEOUT: 20000, // 20 seconds
  MAX_RETRY_ATTEMPTS: 5,
  UPLOAD_MAX_SIZE: 50 * 1024 * 1024, // 50MB
  FEATURES: {
    REAL_TIME_UPDATES: true,
    AUDIT_LOGGING: true,
    FILE_UPLOADS: true,
    BULK_OPERATIONS: true,
    CSV_EXPORT: true,
    CSV_IMPORT: true,
  },
  NOTIFICATIONS: {
    // Email functionality removed - only push notifications supported
  }
};

// Mock/Demo environment (uses local mock data)
const mockConfig: EnvironmentConfig = {
  API_BASE_URL: 'http://localhost:3000/mock-api',
  WS_URL: '',
  AUTH_ENABLED: false,
  DEBUG_MODE: true,
  API_TIMEOUT: 5000, // 5 seconds
  MAX_RETRY_ATTEMPTS: 1,
  UPLOAD_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  FEATURES: {
    REAL_TIME_UPDATES: false,
    AUDIT_LOGGING: false,
    FILE_UPLOADS: false,
    BULK_OPERATIONS: true,
    CSV_EXPORT: true,
    CSV_IMPORT: false,
  },
  NOTIFICATIONS: {
    // Email functionality removed - only push notifications supported
  }
};

// Get environment configuration based on NODE_ENV or REACT_APP_ENV
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.REACT_APP_ENV || process.env.NODE_ENV || 'development';
  
  switch (env.toLowerCase()) {
    case 'production':
    case 'prod':
      return productionConfig;
    
    case 'staging':
    case 'stage':
      return stagingConfig;
    
    case 'mock':
    case 'demo':
      return mockConfig;
    
    case 'development':
    case 'dev':
    default:
      return developmentConfig;
  }
}

// Environment detection utilities
export function isDevelopment(): boolean {
  return (process.env.NODE_ENV || 'development') === 'development';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isStaging(): boolean {
  return process.env.REACT_APP_ENV === 'staging';
}

export function isMockMode(): boolean {
  return process.env.REACT_APP_ENV === 'mock';
}

// Feature flags based on environment
export function isFeatureEnabled(feature: keyof EnvironmentConfig['FEATURES']): boolean {
  const config = getEnvironmentConfig();
  return config.FEATURES[feature];
}

// API configuration helpers
export function getApiBaseUrl(): string {
  // Allow override via environment variable
  return process.env.REACT_APP_API_URL || getEnvironmentConfig().API_BASE_URL;
}

export function getWebSocketUrl(): string {
  // Allow override via environment variable
  return process.env.REACT_APP_WS_URL || getEnvironmentConfig().WS_URL;
}

export function getApiTimeout(): number {
  const envTimeout = process.env.REACT_APP_API_TIMEOUT;
  return envTimeout ? parseInt(envTimeout, 10) : getEnvironmentConfig().API_TIMEOUT;
}

export function getMaxRetryAttempts(): number {
  const envRetries = process.env.REACT_APP_MAX_RETRIES;
  return envRetries ? parseInt(envRetries, 10) : getEnvironmentConfig().MAX_RETRY_ATTEMPTS;
}

export function getUploadMaxSize(): number {
  const envMaxSize = process.env.REACT_APP_UPLOAD_MAX_SIZE;
  return envMaxSize ? parseInt(envMaxSize, 10) : getEnvironmentConfig().UPLOAD_MAX_SIZE;
}

// Debug logging utility
export function debugLog(message: string, ...args: any[]): void {
  if (getEnvironmentConfig().DEBUG_MODE) {
    console.log(`[FleetFix Debug] ${message}`, ...args);
  }
}

// Environment validation
export function validateEnvironmentConfig(): { valid: boolean; errors: string[] } {
  const config = getEnvironmentConfig();
  const errors: string[] = [];
  
  // Validate required URLs
  if (!config.API_BASE_URL) {
    errors.push('API_BASE_URL is required');
  }
  
  if (config.FEATURES.REAL_TIME_UPDATES && !config.WS_URL) {
    errors.push('WS_URL is required when REAL_TIME_UPDATES feature is enabled');
  }
  
  // Validate timeouts
  if (config.API_TIMEOUT < 1000) {
    errors.push('API_TIMEOUT must be at least 1000ms');
  }
  
  if (config.MAX_RETRY_ATTEMPTS < 0) {
    errors.push('MAX_RETRY_ATTEMPTS must be non-negative');
  }
  
  // Validate upload size
  if (config.UPLOAD_MAX_SIZE < 1024) {
    errors.push('UPLOAD_MAX_SIZE must be at least 1KB');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Export current environment configuration
export const currentConfig = getEnvironmentConfig();

// Export default configuration for testing
export { developmentConfig, stagingConfig, productionConfig, mockConfig };
