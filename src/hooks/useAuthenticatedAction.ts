import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useAuthModal } from '../context/AuthModalContext';

/**
 * Hook to wrap actions that require authentication
 * Shows auth modal if user is not authenticated
 */
export const useAuthenticatedAction = () => {
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();

  /**
   * Wraps an action to check authentication first
   * @param action - The action to perform if authenticated
   * @param options - Options for handling unauthenticated state
   */
  const executeAction = useCallback(<T extends any[], R>(
    action: (...args: T) => R | Promise<R>,
    options?: {
      onUnauthenticated?: () => void;
      showModal?: boolean;
      modalMode?: 'login' | 'signup' | 'reset';
    }
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      if (!isAuthenticated) {
        // Handle unauthenticated state
        if (options?.onUnauthenticated) {
          options.onUnauthenticated();
        }
        
        // Show auth modal by default
        if (options?.showModal !== false) {
          openAuthModal(options?.modalMode || 'login');
        }
        
        return undefined;
      }

      // User is authenticated, execute the action
      try {
        const result = await action(...args);
        return result;
      } catch (error) {
        console.error('Error executing authenticated action:', error);
        throw error;
      }
    };
  }, [isAuthenticated, openAuthModal]);

  /**
   * Simple check if action can be performed
   */
  const canPerformAction = useCallback((): boolean => {
    return isAuthenticated;
  }, [isAuthenticated]);

  /**
   * Request authentication if not authenticated
   */
  const requestAuth = useCallback((mode?: 'login' | 'signup' | 'reset') => {
    if (!isAuthenticated) {
      openAuthModal(mode || 'login');
      return false;
    }
    return true;
  }, [isAuthenticated, openAuthModal]);

  return {
    executeAction,
    canPerformAction,
    requestAuth,
    isAuthenticated
  };
};

/**
 * Example usage in a component:
 * 
 * const MyComponent = () => {
 *   const { executeAction } = useAuthenticatedAction();
 *   
 *   const handleLike = executeAction(async () => {
 *     // This will only run if user is authenticated
 *     await api.likePost(postId);
 *   });
 * 
 *   const handleComment = executeAction(
 *     async (comment: string) => {
 *       await api.addComment(postId, comment);
 *     },
 *     { 
 *       modalMode: 'signup',
 *       onUnauthenticated: () => toast.error('Please sign up to comment')
 *     }
 *   );
 * 
 *   return (
 *     <div>
 *       <button onClick={handleLike}>Like</button>
 *       <button onClick={() => handleComment('Great post!')}>Comment</button>
 *     </div>
 *   );
 * };
 */