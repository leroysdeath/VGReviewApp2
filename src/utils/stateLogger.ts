// State Logger - Debug utility for tracking state transitions
// Enable via console: localStorage.setItem('DEBUG_STATE', 'true'); location.reload();

interface StateSnapshot {
  timestamp: number;
  event: string;
  data: any;
}

class StateLogger {
  private logs: StateSnapshot[] = [];
  private maxLogs = 100;

  log(event: string, data: any = {}) {
    const DEBUG_STATE = typeof window !== 'undefined' && localStorage.getItem('DEBUG_STATE') === 'true';
    if (!DEBUG_STATE) return;

    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      event,
      data: this.sanitize(data)
    };

    this.logs.push(snapshot);

    // Keep only last 100 logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console log with color coding
    const color = this.getEventColor(event);
    console.log(`%c[StateLogger] ${event}`, `color: ${color}; font-weight: bold`, data);
  }

  private getEventColor(event: string): string {
    if (event.includes('error') || event.includes('failed')) return '#ef4444';
    if (event.includes('success') || event.includes('set')) return '#10b981';
    if (event.includes('start') || event.includes('fetch')) return '#3b82f6';
    if (event.includes('cache')) return '#8b5cf6';
    return '#6b7280';
  }

  private sanitize(data: any): any {
    // Remove sensitive data before logging
    if (typeof data !== 'object' || data === null) return data;

    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'access_token', 'refresh_token', 'apikey'];

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }

    return sanitized;
  }

  getLogs(): StateSnapshot[] {
    return this.logs;
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clear() {
    this.logs = [];
    console.log('%c[StateLogger] Logs cleared', 'color: #10b981; font-weight: bold');
  }

  // Get recent logs for display
  getRecentLogs(count: number = 10): StateSnapshot[] {
    return this.logs.slice(-count).reverse();
  }

  // Get logs by event type
  getLogsByEvent(eventPattern: string): StateSnapshot[] {
    return this.logs.filter(log => log.event.includes(eventPattern));
  }

  // Export to clipboard
  async copyToClipboard(): Promise<boolean> {
    try {
      const exported = this.exportLogs();
      await navigator.clipboard.writeText(exported);
      console.log('%c[StateLogger] Logs copied to clipboard', 'color: #10b981');
      return true;
    } catch (error) {
      console.error('[StateLogger] Failed to copy logs:', error);
      return false;
    }
  }
}

export const stateLogger = new StateLogger();

// Make available in console for debugging
if (typeof window !== 'undefined') {
  (window as any).stateLogger = stateLogger;
}

// Helper to enable debug mode from console
if (typeof window !== 'undefined') {
  (window as any).enableDebugState = () => {
    localStorage.setItem('DEBUG_STATE', 'true');
    console.log('%c[StateLogger] Debug mode enabled. Reload page to see logs.', 'color: #10b981; font-weight: bold');
  };

  (window as any).disableDebugState = () => {
    localStorage.removeItem('DEBUG_STATE');
    console.log('%c[StateLogger] Debug mode disabled.', 'color: #ef4444; font-weight: bold');
  };
}
