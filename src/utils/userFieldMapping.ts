/**
 * Utility functions for mapping user data between database and form fields
 * Standardizes field mapping across the application
 */

/**
 * Maps database user record to form-compatible structure
 * Handles both snake_case database fields to camelCase form fields
 * Also handles fallback values and legacy field names
 */
export const mapDatabaseUserToForm = (dbUser: any) => {
  if (!dbUser) {
    return {
      username: '',
      displayName: '',
      email: '',
      bio: '',
      location: '',
      website: '',
      platform: '',
      avatar: ''
    };
  }

  return {
    username: dbUser.username || dbUser.name || '',
    displayName: dbUser.display_name || '',
    email: dbUser.email || '',
    bio: dbUser.bio || '',
    location: dbUser.location || '',
    website: dbUser.website || '',
    platform: dbUser.platform || '',
    // Handle both new avatar_url and legacy picurl fields
    avatar: dbUser.avatar_url || dbUser.picurl || ''
  };
};

/**
 * Maps form data to database-compatible structure
 * Converts camelCase form fields to snake_case database fields
 */
export const mapFormToDatabase = (formData: any) => {
  const dbData: any = {};
  
  if ('username' in formData) {
    dbData.username = formData.username;
    // Also update name field for backwards compatibility
    dbData.name = formData.username;
  }
  
  if ('displayName' in formData) {
    dbData.display_name = formData.displayName;
  }
  
  if ('email' in formData) {
    dbData.email = formData.email?.toLowerCase(); // Ensure email is lowercase
  }
  
  if ('bio' in formData) {
    dbData.bio = formData.bio;
  }
  
  if ('location' in formData) {
    dbData.location = formData.location;
  }
  
  if ('website' in formData) {
    dbData.website = formData.website;
  }
  
  if ('platform' in formData) {
    dbData.platform = formData.platform;
  }
  
  if ('avatar' in formData && formData.avatar) {
    // Use avatar_url as the standard field
    dbData.avatar_url = formData.avatar;
  }
  
  return dbData;
};

/**
 * Validates that a string is a valid UUID v4 format
 */
export const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Ensures username is valid format (lowercase, no spaces)
 */
export const normalizeUsername = (username: string): string => {
  return username
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, ''); // Remove invalid characters
};

/**
 * Ensures email is valid format (lowercase, trimmed)
 */
export const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};