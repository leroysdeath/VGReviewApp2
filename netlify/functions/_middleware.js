const getEnvironment = () => {
  return process.env.ENVIRONMENT || process.env.NODE_ENV || 'development';
};

const getAllowedOrigins = () => {
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

const validateOrigin = (origin) => {
  if (!origin) return null;
  
  const allowedOrigins = getAllowedOrigins();
  const normalizedOrigin = origin.toLowerCase();
  const isAllowed = allowedOrigins.some(allowed => 
    normalizedOrigin === allowed.toLowerCase()
  );
  
  return isAllowed ? origin : null;
};

const getCorsHeaders = (origin = null) => {
  const validOrigin = validateOrigin(origin);
  
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Client-Info, ApiKey',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  
  if (validOrigin) {
    headers['Access-Control-Allow-Origin'] = validOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return headers;
};

export default async (request, context) => {
  const origin = request.headers.get('origin');
  
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin)
    });
  }
  
  // Validate origin for non-OPTIONS requests
  const validOrigin = validateOrigin(origin);
  if (origin && !validOrigin) {
    console.log(`CORS: Origin ${origin} not allowed`);
    return new Response('Origin not allowed', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
  
  // Continue to the next middleware/function
  const response = await context.next();
  
  // Add CORS headers to the response
  const corsHeaders = getCorsHeaders(origin);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
};