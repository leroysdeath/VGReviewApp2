/**
 * SQL Security utilities to prevent injection attacks
 * These functions provide safe ways to handle user input for database queries
 */

/**
 * Sanitizes a search term to prevent SQL injection
 * Removes SQL special characters and limits length
 */
export function sanitizeSearchTerm(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  return input
    .replace(/['"\\;()%_]/g, '') // Remove SQL special characters
    .replace(/--/g, '') // Remove SQL comment syntax
    .replace(/\/\*/g, '') // Remove SQL block comment start
    .replace(/\*\//g, '') // Remove SQL block comment end
    .trim()
    .slice(0, 100) // Limit to reasonable length
}

/**
 * Validates and sanitizes an array of IDs
 * Ensures all values are positive integers
 */
export function sanitizeIdArray(ids: any[]): number[] {
  if (!Array.isArray(ids)) {
    return []
  }
  
  return ids
    .map(id => parseInt(String(id)))
    .filter(id => !isNaN(id) && id > 0 && id <= Number.MAX_SAFE_INTEGER)
}

/**
 * Validates a single ID
 * Ensures it's a positive integer within safe bounds
 */
export function sanitizeId(id: any): number | null {
  const numId = parseInt(String(id))
  if (isNaN(numId) || numId <= 0 || numId > Number.MAX_SAFE_INTEGER) {
    return null
  }
  return numId
}

/**
 * Sanitizes text input for database storage
 * Prevents injection while preserving legitimate content
 */
export function sanitizeTextInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  return input
    .trim()
    .slice(0, maxLength)
    // Allow normal text but escape any SQL patterns
    .replace(/;/g, '&#59;') // Escape semicolons
    .replace(/--/g, '&#45;&#45;') // Escape SQL comments
}

/**
 * Validates email format and prevents injection
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return ''
  }
  
  // Basic email regex - more permissive than RFC compliant but secure
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  
  const sanitized = email.trim().toLowerCase().slice(0, 254) // Email max length
  
  return emailRegex.test(sanitized) ? sanitized : ''
}

/**
 * Sanitizes order by clauses to prevent injection
 * Only allows whitelisted column names and directions
 */
export function sanitizeOrderBy(
  column: string, 
  direction: string, 
  allowedColumns: string[]
): { column: string; direction: 'asc' | 'desc' } | null {
  
  const sanitizedColumn = column?.trim().toLowerCase()
  const sanitizedDirection = direction?.trim().toLowerCase()
  
  if (!allowedColumns.includes(sanitizedColumn)) {
    return null
  }
  
  const validDirection = sanitizedDirection === 'desc' ? 'desc' : 'asc'
  
  return {
    column: sanitizedColumn,
    direction: validDirection
  }
}

/**
 * Validates pagination parameters
 */
export function sanitizePagination(page: any, limit: any): { page: number; limit: number } {
  const pageNum = Math.max(1, parseInt(String(page)) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 20))
  
  return {
    page: pageNum,
    limit: limitNum
  }
}