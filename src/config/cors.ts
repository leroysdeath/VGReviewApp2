interface CorsConfig {
  allowedOrigins: string[];
  apiBaseUrl: string;
  environment: 'development' | 'staging' | 'production';
}

const getEnvironment = (): 'development' | 'staging' | 'production' => {
  const env = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development';
  
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
};

const getEnvironmentConfig = (): CorsConfig => {
  const environment = getEnvironment();
  
  switch (environment) {
    case 'production':
      return {
        environment: 'production',
        allowedOrigins: [
          'https://grand-narwhal-4e85d9.space',
          'https://www.grand-narwhal-4e85d9.space'
        ],
        apiBaseUrl: 'https://grand-narwhal-4e85d9.space/api'
      };
    
    case 'staging':
      return {
        environment: 'staging',
        allowedOrigins: [
          'https://staging.grand-narwhal-4e85d9.space',
          'http://localhost:5173',
          'http://localhost:3000'
        ],
        apiBaseUrl: 'https://staging.grand-narwhal-4e85d9.space/api'
      };
    
    case 'development':
    default:
      return {
        environment: 'development',
        allowedOrigins: [
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:8888',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:8888'
        ],
        apiBaseUrl: 'http://localhost:8888/api'
      };
  }
};

export const corsConfig = getEnvironmentConfig();

export const validateOrigin = (origin: string): boolean => {
  if (!origin) return false;
  
  const normalizedOrigin = origin.toLowerCase();
  return corsConfig.allowedOrigins.some(allowed => 
    normalizedOrigin === allowed.toLowerCase()
  );
};

export const getCurrentOrigin = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return corsConfig.allowedOrigins[0];
};

export const isCorsEnabled = (): boolean => {
  return corsConfig.environment !== 'development';
};

export const getCorsHeaders = (): Record<string, string> => {
  const currentOrigin = getCurrentOrigin();
  
  if (!validateOrigin(currentOrigin) && isCorsEnabled()) {
    console.warn('Current origin not in allowed origins list:', currentOrigin);
  }
  
  return {
    'Origin': currentOrigin,
    'X-Requested-With': 'XMLHttpRequest'
  };
};