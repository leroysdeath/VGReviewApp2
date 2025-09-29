// Use dynamic import to avoid initialization issues
let DOMPurify: any = null;

// Only import DOMPurify in browser environment
if (typeof window !== 'undefined') {
  import('dompurify').then(module => {
    DOMPurify = module.default;
  });
}

/**
 * Sanitization utility for preventing XSS attacks in user-generated content
 */

// Configure DOMPurify to be more restrictive for user content
const createSanitizer = () => {
  // Create a DOMPurify instance with custom config
  // Use DOMPurify if available, otherwise use a safe fallback
  const purify = DOMPurify || {
    sanitize: (str: string, config?: any) => {
      // Basic HTML escaping as fallback
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
  };
  
  // Configure allowed tags and attributes for different content types
  const configs = {
    // Strict mode for usernames and display names - no HTML allowed
    strict: {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    },
    
    // Basic mode for bio, location - allows basic formatting
    basic: {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    },
    
    // Rich mode for reviews and comments - allows more formatting
    rich: {
      ALLOWED_TAGS: [
        'b', 'i', 'em', 'strong', 'u', 's', 'br', 'p', 
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
        'h3', 'h4', 'h5', 'h6'
      ],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    },
    
    // URL mode for website fields
    url: {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    }
  };
  
  return { purify, configs };
};

const { purify, configs } = createSanitizer();

/**
 * Sanitize strict content (usernames, display names)
 * Removes ALL HTML tags and dangerous characters
 */
export const sanitizeStrict = (input: string | null | undefined): string => {
  if (!input) return '';
  
  // Remove all HTML tags and trim
  const cleaned = purify.sanitize(input, configs.strict);
  
  // Additional validation for usernames - alphanumeric, underscore, hyphen only
  // This is for display purposes; actual username validation should be done separately
  return cleaned.trim();
};

/**
 * Sanitize basic content (bio, location, general text fields)
 * Allows basic formatting tags only
 */
export const sanitizeBasic = (input: string | null | undefined): string => {
  if (!input) return '';
  
  return purify.sanitize(input, configs.basic).trim();
};

/**
 * Sanitize rich content (reviews, comments)
 * Allows more formatting but still removes dangerous elements
 */
export const sanitizeRich = (input: string | null | undefined): string => {
  if (!input) return '';
  
  return purify.sanitize(input, configs.rich).trim();
};

/**
 * Sanitize URL inputs
 * Ensures only valid URLs are allowed
 */
export const sanitizeURL = (input: string | null | undefined): string => {
  if (!input) return '';
  
  // First sanitize any HTML
  const cleaned = purify.sanitize(input, configs.url).trim();
  
  // Validate URL format
  if (cleaned) {
    try {
      // Check if it's a valid URL
      const url = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
      
      // Only allow http(s) protocols
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
    } catch {
      // If not a valid URL, return empty string
      return '';
    }
  }
  
  return '';
};

/**
 * Sanitize an object containing multiple fields
 * Useful for sanitizing entire forms or data objects
 */
export interface SanitizeFieldConfig {
  field: string;
  type: 'strict' | 'basic' | 'rich' | 'url';
}

export const sanitizeObject = <T extends Record<string, any>>(
  obj: T,
  fieldConfigs: SanitizeFieldConfig[]
): T => {
  const sanitized = { ...obj };
  
  fieldConfigs.forEach(({ field, type }) => {
    if (field in sanitized && sanitized[field] !== null && sanitized[field] !== undefined) {
      switch (type) {
        case 'strict':
          sanitized[field] = sanitizeStrict(sanitized[field]);
          break;
        case 'basic':
          sanitized[field] = sanitizeBasic(sanitized[field]);
          break;
        case 'rich':
          sanitized[field] = sanitizeRich(sanitized[field]);
          break;
        case 'url':
          sanitized[field] = sanitizeURL(sanitized[field]);
          break;
      }
    }
  });
  
  return sanitized;
};

/**
 * Escape HTML entities for safe display
 * Use this when you need to display user input as plain text
 */
export const escapeHtml = (input: string | null | undefined): string => {
  if (!input) return '';

  // Check if document is available
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  // Fallback for non-browser environments
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate and sanitize email addresses
 */
export const sanitizeEmail = (input: string | null | undefined): string => {
  if (!input) return '';
  
  // Remove any HTML tags first
  const cleaned = sanitizeStrict(input).toLowerCase().trim();
  
  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return emailRegex.test(cleaned) ? cleaned : '';
};

/**
 * Truncate and sanitize text for previews
 */
export const sanitizeAndTruncate = (
  input: string | null | undefined,
  maxLength: number = 200,
  type: 'strict' | 'basic' | 'rich' = 'basic'
): string => {
  if (!input) return '';
  
  let sanitized: string;
  switch (type) {
    case 'strict':
      sanitized = sanitizeStrict(input);
      break;
    case 'rich':
      sanitized = sanitizeRich(input);
      break;
    default:
      sanitized = sanitizeBasic(input);
  }
  
  if (sanitized.length <= maxLength) return sanitized;
  
  // Truncate at word boundary
  const truncated = sanitized.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
};

/**
 * Create a safe HTML string for rendering
 * Returns an object that can be used with dangerouslySetInnerHTML
 */
export const createSafeHTML = (
  input: string | null | undefined,
  type: 'basic' | 'rich' = 'basic'
): { __html: string } => {
  const sanitized = type === 'rich' ? sanitizeRich(input) : sanitizeBasic(input);
  return { __html: sanitized };
};

// Export default sanitizer for general use
export default {
  strict: sanitizeStrict,
  basic: sanitizeBasic,
  rich: sanitizeRich,
  url: sanitizeURL,
  email: sanitizeEmail,
  object: sanitizeObject,
  escapeHtml,
  truncate: sanitizeAndTruncate,
  createSafeHTML,
};