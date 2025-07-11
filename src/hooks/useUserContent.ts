import { useState, useEffect, useCallback } from 'react';
import { socialService } from '../services/socialService';
import { UserContent, UserContentWithStats } from '../types/social';
import { useAuth } from './useAuth';

export const useUserContent = (initialUserId?: number) => {
  const { user } = useAuth();
  const [content, setContent] = useState<UserContentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<number | undefined>(initialUserId);

  // Load user content
  const loadUserContent = useCallback(async (uid?: number, type?: string) => {
    const targetUserId = uid || userId || (user ? parseInt(user.id) : undefined);
    if (!targetUserId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const contentData = await socialService.getUserContent(targetUserId, type || contentType);
      
      // Convert to UserContentWithStats
      const contentWithStats = contentData.map(item => ({
        ...item,
        comments: 0, // This would come from a real API
        likes: item.like_count,
        shares: 0, // This would come from a real API
        isLiked: false // This would be determined by checking if the current user has liked it
      }));
      
      setContent(contentWithStats);
    } catch (err) {
      console.error('Error loading user content:', err);
      setError('Failed to load user content');
    } finally {
      setLoading(false);
    }
  }, [user, userId, contentType]);

  // Create new content
  const createContent = useCallback(async (
    contentType: string,
    contentUrl: string,
    gameId?: number,
    title?: string,
    description?: string,
    thumbnailUrl?: string
  ) => {
    if (!user) return null;
    
    try {
      const userId = parseInt(user.id);
      const newContent = await socialService.createUserContent(
        userId,
        contentType,
        contentUrl,
        gameId,
        title,
        description,
        thumbnailUrl
      );
      
      if (newContent) {
        // Refresh content list
        await loadUserContent();
      }
      
      return newContent;
    } catch (err) {
      console.error('Error creating content:', err);
      return null;
    }
  }, [user, loadUserContent]);

  // Like content
  const likeContent = useCallback(async (contentId: number) => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      const success = await socialService.likeContent(userId, 'user_content', contentId);
      
      if (success) {
        // Update local state
        setContent(prev => 
          prev.map(item => 
            item.id === contentId
              ? { ...item, likes: item.likes + 1, isLiked: true }
              : item
          )
        );
      }
      
      return success;
    } catch (err) {
      console.error('Error liking content:', err);
      return false;
    }
  }, [user]);

  // Unlike content
  const unlikeContent = useCallback(async (contentId: number) => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      const success = await socialService.unlikeContent(userId, 'user_content', contentId);
      
      if (success) {
        // Update local state
        setContent(prev => 
          prev.map(item => 
            item.id === contentId
              ? { ...item, likes: Math.max(0, item.likes - 1), isLiked: false }
              : item
          )
        );
      }
      
      return success;
    } catch (err) {
      console.error('Error unliking content:', err);
      return false;
    }
  }, [user]);

  // Share content
  const shareContent = useCallback(async (contentId: number, platform?: string) => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      const success = await socialService.shareContent(userId, 'user_content', contentId, platform);
      
      if (success) {
        // Update local state
        setContent(prev => 
          prev.map(item => 
            item.id === contentId
              ? { ...item, shares: item.shares + 1 }
              : item
          )
        );
      }
      
      return success;
    } catch (err) {
      console.error('Error sharing content:', err);
      return false;
    }
  }, [user]);

  // Filter content by type
  const filterByType = useCallback((type?: string) => {
    setContentType(type);
    loadUserContent(userId, type);
  }, [userId, loadUserContent]);

  // Change user
  const changeUser = useCallback((newUserId: number) => {
    setUserId(newUserId);
    loadUserContent(newUserId, contentType);
  }, [contentType, loadUserContent]);

  // Load content on mount or when dependencies change
  useEffect(() => {
    loadUserContent();
  }, [loadUserContent]);

  return {
    content,
    loading,
    error,
    contentType,
    userId,
    loadUserContent,
    createContent,
    likeContent,
    unlikeContent,
    shareContent,
    filterByType,
    changeUser
  };
};