/**
 * Utility to handle Navigator LockManager issues with Supabase auth
 * This addresses the "Acquiring an exclusive Navigator LockManager lock immediately failed" error
 */

export const handleLockManagerError = (error: any): boolean => {
  const errorMessage = error?.message || String(error);
  
  // Check if this is the specific LockManager error
  if (errorMessage.includes('Navigator LockManager lock') && errorMessage.includes('immediately failed')) {
    console.warn('LockManager conflict detected, clearing localStorage auth data...');
    
    try {
      // Clear any auth-related data from localStorage
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Also clear sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth'))) {
          sessionStorage.removeItem(key);
        }
      }
      
      // Mark that we had a LockManager issue for next startup
      sessionStorage.setItem('lockManagerError', 'true');
      
      console.log('Auth storage cleared. Please refresh the page.');
      return true;
    } catch (clearError) {
      console.error('Failed to clear auth storage:', clearError);
      return false;
    }
  }
  
  return false;
};

export const withLockManagerErrorHandling = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const wasHandled = handleLockManagerError(error);
    if (wasHandled) {
      // Suggest page refresh to the user
      const shouldRefresh = confirm(
        'Authentication conflict detected. The page needs to be refreshed to continue. Refresh now?'
      );
      if (shouldRefresh) {
        window.location.reload();
      }
    }
    throw error;
  }
};