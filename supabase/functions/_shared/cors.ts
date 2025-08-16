interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  maxAge: number;
}

const getEnvironment = (): 'development' | 'staging' | 'production' => {
  const env = Deno.env.get('ENVIRONMENT') || Deno.env.get('NODE_ENV') || 'development';
  
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
};

const getAllowedOrigins = (): string[] => {
  const environment = getEnvironment();
  
  switch (environment) {
    case 'production':
      return [
        'https://grand-narwhal-4e85d9.space',
        'https://www.grand-narwhal-4e85d9.space'
      ];
    
    case 'staging':
      return [
        'https://staging.grand-narwhal-4e85d9.space',
        'http://localhost:5173',
        'http://localhost:3000'
      ];
    
    case 'development':
    default:
      return [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8888',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8888'
      ];
  }
};

const corsConfig: CorsConfig = {
  allowedOrigins: getAllowedOrigins(),
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'authorization',
    'x-client-info',
    'apikey',
    'content-type',
    'x-requested-with'
  ],
  maxAge: 86400
};

export const validateOrigin = (origin: string | null): string | null => {
  if (!origin) return null;
  
  const normalizedOrigin = origin.toLowerCase();
  const isAllowed = corsConfig.allowedOrigins.some(allowed => 
    normalizedOrigin === allowed.toLowerCase()
  );
  
  return isAllowed ? origin : null;
};

export const getCorsHeaders = (origin: string | null = null): Record<string, string> => {
  const validOrigin = validateOrigin(origin);
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': corsConfig.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': corsConfig.allowedHeaders.join(', '),
    'Access-Control-Max-Age': corsConfig.maxAge.toString(),
    'Vary': 'Origin'
  };
  
  if (validOrigin) {
    headers['Access-Control-Allow-Origin'] = validOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return headers;
};

export const corsHeaders = getCorsHeaders();

export const handleCorsRequest = (request: Request): Response | null => {
  const origin = request.headers.get('origin');
  
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin)
    });
  }
  
  const validOrigin = validateOrigin(origin);
  if (origin && !validOrigin) {
    return new Response('Origin not allowed', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
  
  return null;
};