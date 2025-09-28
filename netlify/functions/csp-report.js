/**
 * CSP Violation Report Handler
 * Receives and logs Content Security Policy violation reports
 * This helps monitor and debug CSP issues in production
 */

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  try {
    // Parse the CSP violation report
    const report = JSON.parse(event.body);
    const violation = report['csp-report'];

    if (!violation) {
      console.warn('Invalid CSP report received:', event.body);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid report format' })
      };
    }

    // Log the violation details
    const logEntry = {
      timestamp: new Date().toISOString(),
      documentUri: violation['document-uri'],
      violatedDirective: violation['violated-directive'],
      effectiveDirective: violation['effective-directive'],
      blockedUri: violation['blocked-uri'],
      sourceFile: violation['source-file'],
      lineNumber: violation['line-number'],
      columnNumber: violation['column-number'],
      sample: violation['script-sample'],
      referrer: violation['referrer'],
      statusCode: violation['status-code'],
      // Add request metadata
      userAgent: event.headers['user-agent'],
      ip: event.headers['x-forwarded-for'] || event.headers['x-nf-client-connection-ip']
    };

    // Critical violations that need immediate attention
    const criticalViolations = [
      'revenuecat.com',
      'stripe.com',
      'checkout.stripe.com',
      'payments'
    ];

    // Check if this is a critical violation
    const isCritical = criticalViolations.some(term =>
      violation['blocked-uri']?.includes(term) ||
      violation['document-uri']?.includes(term)
    );

    if (isCritical) {
      console.error('🚨 CRITICAL CSP VIOLATION:', JSON.stringify(logEntry, null, 2));
    } else {
      console.log('CSP Violation Report:', JSON.stringify(logEntry, null, 2));
    }

    // In production, you might want to:
    // 1. Send to a logging service (e.g., Sentry, LogRocket)
    // 2. Store in a database for analysis
    // 3. Send alerts for critical violations
    // 4. Aggregate and analyze patterns

    // For now, we'll just acknowledge receipt
    return {
      statusCode: 204, // No Content - standard for CSP report endpoints
      body: ''
    };

  } catch (error) {
    console.error('Error processing CSP report:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};