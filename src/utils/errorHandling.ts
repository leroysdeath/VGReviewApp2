/**
 * Centralized error handling utilities for API calls and runtime errors
 */

export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
  timestamp: string;
}

/**
 * Custom error class for application errors
 */
export class ApplicationError extends Error {
  public code?: string;
  public status?: number;
  public details?: unknown;
  public timestamp: string;

  constructor(message: string, code?: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError);
    }
  }

  toJSON(): AppError {
    return {
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown, context?: string): AppError {
  // Log error in development
  if (import.meta.env.DEV) {
    console.error(`[${context || 'API'}] Error:`, error);
  }

  // Handle different error types
  if (error instanceof ApplicationError) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      return {
        message: 'Network connection error. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        status: 0,
        details: error.message,
        timestamp: new Date().toISOString()
      };
    }

    // Check for Supabase errors
    if ('status' in error && 'message' in error) {
      const supabaseError = error as { status: number; message: string; details?: unknown };
      return {
        message: getErrorMessage(supabaseError.status, supabaseError.message),
        code: `SUPABASE_${supabaseError.status}`,
        status: supabaseError.status,
        details: supabaseError.details,
        timestamp: new Date().toISOString()
      };
    }

    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  // Handle non-Error objects
  if (typeof error === 'string') {
    return {
      message: error,
      code: 'STRING_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    details: error,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get user-friendly error messages based on status codes
 */
function getErrorMessage(status: number, defaultMessage: string): string {
  const messages: Record<number, string> = {
    400: 'Invalid request. Please check your input and try again.',
    401: 'You need to be logged in to perform this action.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'This action conflicts with existing data.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily unavailable. Please try again later.',
    503: 'Service is currently under maintenance. Please try again later.'
  };

  return messages[status] || defaultMessage;
}

/**
 * Retry logic for failed API calls
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  backoffFactor = 2
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }

    // Don't retry on client errors (4xx)
    if (error instanceof ApplicationError && error.status && error.status >= 400 && error.status < 500) {
      throw error;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * backoffFactor, backoffFactor);
  }
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('NetworkError') ||
           error.message.includes('Failed to fetch') ||
           error.message.includes('Network request failed');
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApplicationError) {
    return error.status === 401 || error.code === 'AUTH_ERROR';
  }
  if (error instanceof Error && 'status' in error) {
    return (error as any).status === 401;
  }
  return false;
}

/**
 * Format error for display to user
 */
export function formatErrorForUser(error: unknown): string {
  const appError = handleApiError(error);
  return appError.message;
}