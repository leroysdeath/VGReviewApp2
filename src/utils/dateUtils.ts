import { formatDistanceToNow, format, parseISO, isValid } from 'date-fns';

/**
 * Format a date string or Date object to a relative time string (e.g., "2 hours ago")
 * @param dateInput - The date to format (string or Date object)
 * @returns A relative time string
 */
export const getRelativeTime = (dateInput: string | Date): string => {
  try {
    // Handle string dates
    const date = typeof dateInput === 'string' 
      ? parseISO(dateInput) 
      : dateInput;
    
    // Check if date is valid
    if (!isValid(date)) {
      console.warn('Invalid date provided to getRelativeTime:', dateInput);
      return 'recently';
    }
    
    // Use date-fns to format the relative time
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'recently';
  }
};

/**
 * Format a date to a standard date string
 * @param dateInput - The date to format (string or Date object)
 * @param formatString - The format string (default: 'MMM d, yyyy')
 * @returns A formatted date string
 */
export const formatDate = (
  dateInput: string | Date, 
  formatString: string = 'MMM d, yyyy'
): string => {
  try {
    const date = typeof dateInput === 'string' 
      ? parseISO(dateInput) 
      : dateInput;
    
    if (!isValid(date)) {
      console.warn('Invalid date provided to formatDate:', dateInput);
      return '';
    }
    
    return format(date, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format a date for display with time
 * @param dateInput - The date to format (string or Date object)
 * @returns A formatted date and time string
 */
export const formatDateTime = (dateInput: string | Date): string => {
  return formatDate(dateInput, 'MMM d, yyyy h:mm a');
};

/**
 * Format a game release date (handles Unix timestamps from IGDB)
 * @param timestamp - Unix timestamp in seconds
 * @returns A formatted date string
 */
export const formatGameReleaseDate = (timestamp: number): string => {
  try {
    // IGDB provides Unix timestamps in seconds, JavaScript expects milliseconds
    const date = new Date(timestamp * 1000);
    
    if (!isValid(date)) {
      return 'TBA';
    }
    
    // Check if date is in the future
    if (date > new Date()) {
      return format(date, 'MMM d, yyyy') + ' (Upcoming)';
    }
    
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting game release date:', error);
    return 'TBA';
  }
};

/**
 * Get a more granular relative time for recent activities
 * Provides better granularity for recent times (minutes, hours)
 * @param dateInput - The date to format (string or Date object)
 * @returns A relative time string with better granularity
 */
export const getDetailedRelativeTime = (dateInput: string | Date): string => {
  try {
    const date = typeof dateInput === 'string' 
      ? parseISO(dateInput) 
      : dateInput;
    
    if (!isValid(date)) {
      return 'recently';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Very recent (less than a minute)
    if (diffSeconds < 60) {
      return 'just now';
    }
    
    // Minutes
    if (diffMinutes < 60) {
      return diffMinutes === 1 
        ? '1 minute ago' 
        : `${diffMinutes} minutes ago`;
    }
    
    // Hours
    if (diffHours < 24) {
      return diffHours === 1 
        ? '1 hour ago' 
        : `${diffHours} hours ago`;
    }
    
    // Use date-fns for days and longer
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting detailed relative time:', error);
    return 'recently';
  }
};