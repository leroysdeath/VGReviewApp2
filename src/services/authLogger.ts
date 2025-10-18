// Auth Logger - Secure authentication error logging system
// Tracks auth events, errors, and debugging information WITHOUT exposing credentials

interface AuthLogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  event: string;
  message: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

interface AuthErrorContext {
  operation: string;
  errorCode?: string;
  errorMessage?: string;
  userId?: string;
  email?: string;
  metadata?: Record<string, any>;
}

class AuthLogger {
  private logs: AuthLogEntry[] = [];
  private maxLogs = 500; // Increased from stateLogger for more auth history
  private enabled: boolean;
  private allowedUsers: Set<string> = new Set(); // User-specific filtering

  // Sensitive keys that should NEVER be logged
  private readonly SENSITIVE_KEYS = [
    'password',
    'token',
    'access_token',
    'refresh_token',
    'apikey',
    'api_key',
    'secret',
    'private_key',
    'jwt',
    'bearer',
    'authorization',
    'session_token',
    'confirmPassword',
    'newPassword',
    'oldPassword'
  ];

  constructor() {
    // Enable auth logging if debug mode is on OR if explicitly enabled
    this.enabled =
      (typeof window !== 'undefined' && localStorage.getItem('DEBUG_AUTH') === 'true') ||
      (typeof window !== 'undefined' && localStorage.getItem('DEBUG_STATE') === 'true');

    // Load allowed users from localStorage
    if (typeof window !== 'undefined') {
      const allowedUsersStr = localStorage.getItem('DEBUG_AUTH_USERS');
      if (allowedUsersStr) {
        try {
          const users = JSON.parse(allowedUsersStr);
          this.allowedUsers = new Set(users);
        } catch (e) {
          console.warn('[AuthLogger] Failed to parse DEBUG_AUTH_USERS:', e);
        }
      }

      (window as any).authLogger = this;
    }
  }

  /**
   * Log an info-level auth event
   */
  info(event: string, message: string, metadata?: Record<string, any>) {
    this.log('info', event, message, metadata);
  }

  /**
   * Log a warning-level auth event
   */
  warn(event: string, message: string, metadata?: Record<string, any>) {
    this.log('warn', event, message, metadata);
  }

  /**
   * Log an error-level auth event with optional stack trace
   */
  error(event: string, message: string, error?: any, metadata?: Record<string, any>) {
    const stackTrace = error?.stack || new Error().stack;
    this.log('error', event, message, { ...metadata, errorDetails: this.sanitizeError(error) }, stackTrace);
  }

  /**
   * Log a debug-level auth event
   */
  debug(event: string, message: string, metadata?: Record<string, any>) {
    this.log('debug', event, message, metadata);
  }

  /**
   * Log an authentication attempt
   */
  logAuthAttempt(operation: 'login' | 'signup' | 'logout' | 'reset_password' | 'update_password', email?: string) {
    this.info(
      `auth_attempt_${operation}`,
      `Authentication attempt: ${operation}`,
      {
        operation,
        email: this.sanitizeEmail(email),
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Log an authentication success
   */
  logAuthSuccess(operation: 'login' | 'signup' | 'logout' | 'reset_password' | 'update_password', userId?: string, email?: string) {
    this.info(
      `auth_success_${operation}`,
      `Authentication successful: ${operation}`,
      {
        operation,
        userId: this.sanitizeUserId(userId),
        email: this.sanitizeEmail(email),
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Log an authentication failure with detailed context
   */
  logAuthFailure(context: AuthErrorContext, error?: any) {
    this.error(
      `auth_failure_${context.operation}`,
      `Authentication failed: ${context.operation}`,
      error,
      {
        operation: context.operation,
        errorCode: context.errorCode,
        errorMessage: this.sanitizeErrorMessage(context.errorMessage || error?.message),
        userId: this.sanitizeUserId(context.userId),
        email: this.sanitizeEmail(context.email),
        metadata: this.sanitize(context.metadata || {}),
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Log session state changes
   */
  logSessionChange(event: string, hasSession: boolean, userId?: string) {
    this.debug(
      `session_${event}`,
      `Session state changed: ${event}`,
      {
        event,
        hasSession,
        userId: this.sanitizeUserId(userId),
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Log database user ID operations
   */
  logDbUserIdOperation(operation: 'fetch' | 'create' | 'update', success: boolean, userId?: number, error?: any) {
    const level = success ? 'info' : 'error';
    this[level](
      `dbUserId_${operation}_${success ? 'success' : 'failure'}`,
      `Database user ID ${operation} ${success ? 'succeeded' : 'failed'}`,
      {
        operation,
        success,
        userId: userId ? `***${String(userId).slice(-4)}` : undefined,
        error: error ? this.sanitizeError(error) : undefined,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Core logging method - sanitizes and stores log entries
   */
  private log(
    level: 'info' | 'warn' | 'error' | 'debug',
    event: string,
    message: string,
    metadata?: Record<string, any>,
    stackTrace?: string
  ) {
    if (!this.enabled && level !== 'error') return; // Always log errors

    // Check user filtering (if filters are active)
    if (!this.shouldLog(level, metadata)) return;

    const entry: AuthLogEntry = {
      timestamp: Date.now(),
      level,
      event,
      message,
      metadata: metadata ? this.sanitize(metadata) : undefined,
      stackTrace: stackTrace ? this.sanitizeStackTrace(stackTrace) : undefined
    };

    this.logs.push(entry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with color coding
    this.consoleLog(entry);
  }

  /**
   * Check if this log entry should be recorded based on user filters
   */
  private shouldLog(level: 'info' | 'warn' | 'error' | 'debug', metadata?: Record<string, any>): boolean {
    // Always log errors regardless of user filters
    if (level === 'error') return true;

    // If no user filters are set, log everything
    if (this.allowedUsers.size === 0) return true;

    // Check if any user identifier in metadata matches allowed users
    if (!metadata) return false;

    const { email, userId } = metadata;

    // Check email (might be sanitized)
    if (email && this.isUserAllowed(email)) return true;

    // Check userId (might be sanitized)
    if (userId && this.isUserAllowed(userId)) return true;

    return false;
  }

  /**
   * Check if a value (email or userId) matches any allowed user
   */
  private isUserAllowed(value: string): boolean {
    if (!value) return false;

    // Extract actual value from sanitized format
    const actualValue = this.extractActualValue(value);

    // Check against all allowed users
    for (const allowedUser of this.allowedUsers) {
      const lowerAllowed = allowedUser.toLowerCase();
      const lowerValue = actualValue.toLowerCase();

      // Exact match
      if (lowerValue === lowerAllowed) return true;

      // Partial match for emails (handle sanitized format)
      if (lowerValue.includes('@') && lowerAllowed.includes('@')) {
        const [, domain] = lowerValue.split('@');
        const [allowedLocal, allowedDomain] = lowerAllowed.split('@');

        // Match by domain and first few chars
        if (domain === allowedDomain && lowerValue.startsWith(allowedLocal.slice(0, 3))) {
          return true;
        }
      }

      // Username match (partial)
      if (!lowerValue.includes('@') && !lowerAllowed.includes('@')) {
        if (lowerValue.includes(lowerAllowed) || lowerAllowed.includes(lowerValue)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Extract actual value from sanitized format
   */
  private extractActualValue(sanitized: string): string {
    // Remove sanitization markers
    return sanitized.replace(/\*+/g, '');
  }

  /**
   * Output to console with appropriate formatting
   */
  private consoleLog(entry: AuthLogEntry) {
    const colors = {
      info: '#3b82f6',
      warn: '#f59e0b',
      error: '#ef4444',
      debug: '#6b7280'
    };

    const icon = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍'
    };

    const color = colors[entry.level];
    const prefix = `%c${icon[entry.level]} [AuthLogger:${entry.level.toUpperCase()}] ${entry.event}`;
    const style = `color: ${color}; font-weight: bold`;

    if (entry.metadata) {
      console[entry.level === 'error' ? 'error' : 'log'](prefix, style, entry.message, entry.metadata);
    } else {
      console[entry.level === 'error' ? 'error' : 'log'](prefix, style, entry.message);
    }

    if (entry.stackTrace && entry.level === 'error') {
      console.error('Stack Trace:', entry.stackTrace);
    }
  }

  /**
   * Sanitize any data to remove sensitive information
   */
  private sanitize(data: any): any {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // Check if key contains sensitive information
      if (this.SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize error objects
   */
  private sanitizeError(error: any): any {
    if (!error) return undefined;

    if (typeof error === 'string') {
      return this.sanitizeErrorMessage(error);
    }

    const sanitized: any = {
      message: this.sanitizeErrorMessage(error.message),
      name: error.name,
      code: error.code
    };

    // Include additional error properties but sanitize them
    for (const key in error) {
      if (key !== 'message' && key !== 'name' && key !== 'code' && key !== 'stack') {
        sanitized[key] = this.sanitize(error[key]);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize error messages to remove potential sensitive data
   */
  private sanitizeErrorMessage(message?: string): string {
    if (!message) return 'Unknown error';

    // Remove email addresses from error messages
    let sanitized = message.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g, '[EMAIL]');

    // Remove JWT tokens from error messages
    sanitized = sanitized.replace(/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, '[JWT_TOKEN]');

    return sanitized;
  }

  /**
   * Sanitize email addresses (show partial for debugging)
   */
  private sanitizeEmail(email?: string): string | undefined {
    if (!email) return undefined;

    const [localPart, domain] = email.split('@');
    if (!domain) return '[INVALID_EMAIL]';

    const visibleChars = Math.min(3, localPart.length);
    const maskedLocal = localPart.slice(0, visibleChars) + '***';

    return `${maskedLocal}@${domain}`;
  }

  /**
   * Sanitize user IDs (show last 4 chars for debugging)
   */
  private sanitizeUserId(userId?: string | number): string | undefined {
    if (!userId) return undefined;

    const id = String(userId);
    if (id.length <= 4) return '***' + id;

    return '***' + id.slice(-4);
  }

  /**
   * Sanitize stack traces to remove sensitive file paths
   */
  private sanitizeStackTrace(stackTrace: string): string {
    // Remove absolute file paths but keep relative paths
    return stackTrace.replace(/\/[^\s:]+\//g, '.../');
  }

  /**
   * Get all logs
   */
  getLogs(): AuthLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 20): AuthLogEntry[] {
    return this.logs.slice(-count).reverse();
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: 'info' | 'warn' | 'error' | 'debug'): AuthLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs by event pattern
   */
  getLogsByEvent(eventPattern: string): AuthLogEntry[] {
    return this.logs.filter(log => log.event.includes(eventPattern));
  }

  /**
   * Get error logs only
   */
  getErrors(): AuthLogEntry[] {
    return this.getLogsByLevel('error');
  }

  /**
   * Export logs to JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Export logs to clipboard
   */
  async copyToClipboard(): Promise<boolean> {
    try {
      const exported = this.exportLogs();
      await navigator.clipboard.writeText(exported);
      console.log('%c✅ [AuthLogger] Logs copied to clipboard', 'color: #10b981; font-weight: bold');
      return true;
    } catch (error) {
      console.error('❌ [AuthLogger] Failed to copy logs:', error);
      return false;
    }
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    console.log('%c✅ [AuthLogger] Logs cleared', 'color: #10b981; font-weight: bold');
  }

  /**
   * Add user(s) to the allowed users filter
   */
  addAllowedUsers(...users: string[]) {
    users.forEach(user => {
      if (user && user.trim()) {
        this.allowedUsers.add(user.trim().toLowerCase());
      }
    });
    this.saveAllowedUsers();
    console.log('%c✅ [AuthLogger] User filter updated', 'color: #10b981; font-weight: bold', {
      allowedUsers: Array.from(this.allowedUsers),
      filterActive: this.allowedUsers.size > 0
    });
  }

  /**
   * Remove user(s) from the allowed users filter
   */
  removeAllowedUsers(...users: string[]) {
    users.forEach(user => {
      if (user) {
        this.allowedUsers.delete(user.trim().toLowerCase());
      }
    });
    this.saveAllowedUsers();
    console.log('%c✅ [AuthLogger] User filter updated', 'color: #10b981; font-weight: bold', {
      allowedUsers: Array.from(this.allowedUsers),
      filterActive: this.allowedUsers.size > 0
    });
  }

  /**
   * Clear all user filters (log for all users)
   */
  clearAllowedUsers() {
    this.allowedUsers.clear();
    this.saveAllowedUsers();
    console.log('%c✅ [AuthLogger] User filters cleared - logging all users', 'color: #10b981; font-weight: bold');
  }

  /**
   * Get current allowed users list
   */
  getAllowedUsers(): string[] {
    return Array.from(this.allowedUsers);
  }

  /**
   * Save allowed users to localStorage
   */
  private saveAllowedUsers() {
    if (typeof window !== 'undefined') {
      const users = Array.from(this.allowedUsers);
      if (users.length > 0) {
        localStorage.setItem('DEBUG_AUTH_USERS', JSON.stringify(users));
      } else {
        localStorage.removeItem('DEBUG_AUTH_USERS');
      }
    }
  }

  /**
   * Enable auth logging
   */
  enable() {
    this.enabled = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('DEBUG_AUTH', 'true');
    }
    const filterInfo = this.allowedUsers.size > 0
      ? ` (filtering for ${this.allowedUsers.size} user(s))`
      : '';
    console.log(`%c✅ [AuthLogger] Auth logging enabled${filterInfo}`, 'color: #10b981; font-weight: bold');
    if (this.allowedUsers.size > 0) {
      console.log('%cFiltered users:', 'color: #6b7280', Array.from(this.allowedUsers));
    }
  }

  /**
   * Disable auth logging
   */
  disable() {
    this.enabled = false;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('DEBUG_AUTH');
    }
    console.log('%c⚠️ [AuthLogger] Auth logging disabled', 'color: #f59e0b; font-weight: bold');
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate auth error report
   */
  generateErrorReport(): string {
    const errors = this.getErrors();

    if (errors.length === 0) {
      return 'No authentication errors recorded.';
    }

    let report = '=== Authentication Error Report ===\n\n';
    report += `Total Errors: ${errors.length}\n`;
    report += `Time Range: ${new Date(errors[0].timestamp).toISOString()} to ${new Date(errors[errors.length - 1].timestamp).toISOString()}\n\n`;
    report += '=== Error Details ===\n\n';

    errors.forEach((error, index) => {
      report += `${index + 1}. [${new Date(error.timestamp).toISOString()}] ${error.event}\n`;
      report += `   Message: ${error.message}\n`;
      if (error.metadata) {
        report += `   Metadata: ${JSON.stringify(error.metadata, null, 2)}\n`;
      }
      if (error.stackTrace) {
        report += `   Stack: ${error.stackTrace.split('\n')[0]}\n`;
      }
      report += '\n';
    });

    return report;
  }

  /**
   * Get auth statistics
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {
        info: this.logs.filter(l => l.level === 'info').length,
        warn: this.logs.filter(l => l.level === 'warn').length,
        error: this.logs.filter(l => l.level === 'error').length,
        debug: this.logs.filter(l => l.level === 'debug').length
      },
      byOperation: {} as Record<string, number>,
      recentErrors: this.getErrors().slice(-5).reverse()
    };

    // Count operations
    this.logs.forEach(log => {
      const operation = log.event.split('_')[0];
      stats.byOperation[operation] = (stats.byOperation[operation] || 0) + 1;
    });

    return stats;
  }
}

// Create singleton instance
export const authLogger = new AuthLogger();

// Make available in console for debugging
if (typeof window !== 'undefined') {
  (window as any).authLogger = authLogger;

  // Helper functions for console access
  (window as any).enableAuthLogging = () => authLogger.enable();
  (window as any).disableAuthLogging = () => authLogger.disable();
  (window as any).getAuthErrors = () => authLogger.getErrors();
  (window as any).getAuthStats = () => authLogger.getStats();
  (window as any).exportAuthLogs = () => authLogger.copyToClipboard();
  (window as any).authErrorReport = () => console.log(authLogger.generateErrorReport());

  // User filtering helper functions
  (window as any).addAuthUsers = (...users: string[]) => authLogger.addAllowedUsers(...users);
  (window as any).removeAuthUsers = (...users: string[]) => authLogger.removeAllowedUsers(...users);
  (window as any).clearAuthUsers = () => authLogger.clearAllowedUsers();
  (window as any).getAuthUsers = () => authLogger.getAllowedUsers();
}
