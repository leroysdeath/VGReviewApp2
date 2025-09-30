/**
 * CSP Monitoring Service
 * Tracks and analyzes Content Security Policy violations in development
 * Helps identify and fix CSP issues before production deployment
 */

interface CSPViolation {
  blockedURI: string;
  columnNumber?: number;
  disposition: string;
  documentURI: string;
  effectiveDirective: string;
  lineNumber?: number;
  originalPolicy: string;
  referrer?: string;
  sample?: string;
  sourceFile?: string;
  statusCode?: number;
  violatedDirective: string;
}

class CSPMonitoringService {
  private violations: CSPViolation[] = [];
  private isMonitoring = false;
  private violationCallback?: (violation: CSPViolation) => void;

  /**
   * Start monitoring for CSP violations
   * Only enabled in development mode
   */
  startMonitoring(callback?: (violation: CSPViolation) => void) {
    // Only monitor in development
    if (import.meta.env.PROD) {
      console.log('CSP monitoring disabled in production');
      return;
    }

    if (this.isMonitoring) {
      console.warn('CSP monitoring already active');
      return;
    }

    this.violationCallback = callback;
    this.isMonitoring = true;

    // Listen for security policy violation events
    document.addEventListener('securitypolicyviolation', this.handleViolation);

    console.log('🛡️ CSP Monitoring started');
  }

  /**
   * Stop monitoring for CSP violations
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    document.removeEventListener('securitypolicyviolation', this.handleViolation);
    this.isMonitoring = false;
    console.log('🛡️ CSP Monitoring stopped');
  }

  /**
   * Handle CSP violation event
   */
  private handleViolation = (event: SecurityPolicyViolationEvent) => {
    const violation: CSPViolation = {
      blockedURI: event.blockedURI,
      columnNumber: event.columnNumber,
      disposition: event.disposition,
      documentURI: event.documentURI,
      effectiveDirective: event.effectiveDirective,
      lineNumber: event.lineNumber,
      originalPolicy: event.originalPolicy,
      referrer: event.referrer,
      sample: event.sample,
      sourceFile: event.sourceFile,
      statusCode: event.statusCode,
      violatedDirective: event.violatedDirective,
    };

    this.violations.push(violation);

    // Log violation details in development
    console.warn('🚨 CSP Violation Detected:', {
      directive: violation.violatedDirective,
      blockedResource: violation.blockedURI,
      source: violation.sourceFile || 'unknown',
      line: violation.lineNumber,
      column: violation.columnNumber,
      sample: violation.sample,
    });

    // Call callback if provided
    if (this.violationCallback) {
      this.violationCallback(violation);
    }

    // Send to reporting endpoint if configured
    this.reportViolation(violation);
  };

  /**
   * Report violation to server endpoint
   */
  private async reportViolation(violation: CSPViolation) {
    try {
      // Only report in development or if explicitly enabled
      if (import.meta.env.PROD && !import.meta.env.VITE_CSP_REPORTING_ENABLED) {
        return;
      }

      const report = {
        'csp-report': {
          'blocked-uri': violation.blockedURI,
          'column-number': violation.columnNumber,
          'document-uri': violation.documentURI,
          'effective-directive': violation.effectiveDirective,
          'line-number': violation.lineNumber,
          'original-policy': violation.originalPolicy,
          'referrer': violation.referrer,
          'script-sample': violation.sample,
          'source-file': violation.sourceFile,
          'status-code': violation.statusCode,
          'violated-directive': violation.violatedDirective,
        }
      };

      await fetch('/.netlify/functions/csp-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/csp-report',
        },
        body: JSON.stringify(report),
      });
    } catch (error) {
      // Silently fail - we don't want CSP reporting to break the app
      console.error('Failed to report CSP violation:', error);
    }
  }

  /**
   * Get all recorded violations
   */
  getViolations(): CSPViolation[] {
    return [...this.violations];
  }

  /**
   * Clear recorded violations
   */
  clearViolations() {
    this.violations = [];
  }

  /**
   * Get violation summary for debugging
   */
  getSummary() {
    const summary: Record<string, number> = {};

    this.violations.forEach(violation => {
      const key = `${violation.violatedDirective}:${violation.blockedURI}`;
      summary[key] = (summary[key] || 0) + 1;
    });

    return {
      totalViolations: this.violations.length,
      uniqueViolations: Object.keys(summary).length,
      violations: summary,
      mostCommon: Object.entries(summary)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([key, count]) => ({ violation: key, count })),
    };
  }

  /**
   * Check if a specific resource would be blocked
   */
  wouldBeBlocked(resourceUrl: string): boolean {
    return this.violations.some(v => v.blockedURI === resourceUrl);
  }

  /**
   * Get recommendations based on violations
   */
  getRecommendations() {
    const recommendations: string[] = [];
    const directives = new Set(this.violations.map(v => v.effectiveDirective));

    if (directives.has('script-src')) {
      recommendations.push('Consider adding necessary script sources to your CSP');
    }
    if (directives.has('style-src')) {
      recommendations.push('Review inline styles or add style sources to CSP');
    }
    if (directives.has('img-src')) {
      recommendations.push('Add image sources to CSP img-src directive');
    }
    if (directives.has('connect-src')) {
      recommendations.push('Add API endpoints to CSP connect-src directive');
    }

    // Check for payment-related violations
    const paymentRelated = this.violations.some(v =>
      v.blockedURI.includes('stripe') ||
      v.blockedURI.includes('revenuecat') ||
      v.blockedURI.includes('payment')
    );

    if (paymentRelated) {
      recommendations.push('⚠️ Payment provider resources blocked - update CSP before launching payments');
    }

    return recommendations;
  }
}

// Export singleton instance
export const cspMonitor = new CSPMonitoringService();

// Auto-start monitoring in development
if (import.meta.env.DEV) {
  // Start monitoring after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      cspMonitor.startMonitoring();
    });
  } else {
    cspMonitor.startMonitoring();
  }
}