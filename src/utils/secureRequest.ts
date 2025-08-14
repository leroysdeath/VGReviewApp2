import { corsConfig, getCorsHeaders, validateOrigin, getCurrentOrigin } from '../config/cors';

interface RequestOptions extends RequestInit {
  validateCors?: boolean;
  timeout?: number;
}

class SecureRequestError extends Error {
  constructor(message: string, public status?: number, public statusText?: string) {
    super(message);
    this.name = 'SecureRequestError';
  }
}

const createTimeoutPromise = (timeout: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new SecureRequestError('Request timeout', 408)), timeout);
  });
};

export const secureRequest = async (
  url: string | URL,
  options: RequestOptions = {}
): Promise<Response> => {
  const {
    validateCors = true,
    timeout = 10000,
    headers = {},
    ...fetchOptions
  } = options;

  // Validate current origin if CORS validation is enabled
  if (validateCors && corsConfig.environment !== 'development') {
    const currentOrigin = getCurrentOrigin();
    if (!validateOrigin(currentOrigin)) {
      throw new SecureRequestError(
        `Origin ${currentOrigin} is not allowed`,
        403,
        'Forbidden'
      );
    }
  }

  // Prepare secure headers
  const secureHeaders = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(),
    ...headers
  };

  // Remove any headers that might contain sensitive data in development
  if (corsConfig.environment === 'development') {
    console.log('🔒 Making secure request to:', url.toString());
    console.log('🔒 Headers:', secureHeaders);
  }

  const requestPromise = fetch(url, {
    ...fetchOptions,
    headers: secureHeaders,
    credentials: corsConfig.environment === 'production' ? 'same-origin' : 'include',
    mode: corsConfig.environment === 'production' ? 'same-origin' : 'cors'
  });

  try {
    const response = await Promise.race([
      requestPromise,
      createTimeoutPromise(timeout)
    ]);

    // Check if response is ok
    if (!response.ok) {
      throw new SecureRequestError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    // Validate response headers in production
    if (corsConfig.environment === 'production' && validateCors) {
      const responseOrigin = response.headers.get('Access-Control-Allow-Origin');
      if (responseOrigin && responseOrigin !== getCurrentOrigin() && responseOrigin !== 'null') {
        console.warn('Response origin mismatch:', responseOrigin);
      }
    }

    return response;
  } catch (error) {
    if (error instanceof SecureRequestError) {
      throw error;
    }

    // Handle network errors
    throw new SecureRequestError(
      error instanceof Error ? error.message : 'Network request failed',
      0,
      'Network Error'
    );
  }
};

export const secureJson = async <T = any>(
  url: string | URL,
  options: RequestOptions = {}
): Promise<T> => {
  const response = await secureRequest(url, options);
  
  try {
    return await response.json();
  } catch (error) {
    throw new SecureRequestError(
      'Failed to parse JSON response',
      response.status,
      response.statusText
    );
  }
};

export const securePost = async <T = any>(
  url: string | URL,
  data: any,
  options: RequestOptions = {}
): Promise<T> => {
  return secureJson<T>(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  });
};

export const secureGet = async <T = any>(
  url: string | URL,
  options: RequestOptions = {}
): Promise<T> => {
  return secureJson<T>(url, {
    method: 'GET',
    ...options
  });
};

export { SecureRequestError };