import { useState, useEffect, useCallback } from 'react';
import { socialService } from '../services/socialService';
import { ForumCategory, ForumThread, ForumPost, ForumCategoryWithStats, ForumThreadWithStats } from '../types/social';
import { useAuth } from './useAuth';

export const useForums = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ForumCategoryWithStats[]>([]);
  const [threads, setThreads] = useState<ForumThreadWithStats[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [currentCategoryId, setCurrentCategoryId] = useState<number | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [subscription, setSubscription] = useState<{ unsubscribe: () => void } | null>(null);

  // Load forum categories
  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const categoriesData = await socialService.getForumCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error loading forum categories:', err);
      setError('Failed to load forum categories');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load threads for a category
  const loadThreads = useCallback(async (categoryId: number, pageNum = 1) => {
    setLoading(true);
    setError(null);
    setCurrentCategoryId(categoryId);
    setPage(pageNum);
    
    try {
      const threadsData = await socialService.getForumThreads(categoryId, pageNum);
      
      if (pageNum === 1) {
        setThreads(threadsData);
      } else {
        setThreads(prev => [...prev, ...threadsData]);
      }
      
      setHasMore(threadsData.length === 20); // Assuming 20 is the page size
    } catch (err) {
      console.error('Error loading forum threads:', err);
      setError('Failed to load forum threads');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more threads
  const loadMoreThreads = useCallback(() => {
    if (currentCategoryId && !loading && hasMore) {
      loadThreads(currentCategoryId, page + 1);
    }
  }, [currentCategoryId, loading, hasMore, page, loadThreads]);

  // Load posts for a thread
  const loadPosts = useCallback(async (threadId: number, pageNum = 1) => {
    setLoading(true);
    setError(null);
    setCurrentThreadId(threadId);
    setPage(pageNum);
    
    try {
      const postsData = await socialService.getForumPosts(threadId, pageNum);
      
      if (pageNum === 1) {
        setPosts(postsData);
      } else {
        setPosts(prev => [...prev, ...postsData]);
      }
      
      setHasMore(postsData.length === 20); // Assuming 20 is the page size
      
      // Subscribe to new posts
      if (subscription) {
        subscription.unsubscribe();
      }
      
      const sub = socialService.subscribeToForumPosts(threadId, (newPost) => {
        setPosts(prev => [...prev, newPost]);
      });
      
      setSubscription(sub);
    } catch (err) {
      console.error('Error loading forum posts:', err);
      setError('Failed to load forum posts');
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  // Load more posts
  const loadMorePosts = useCallback(() => {
    if (currentThreadId && !loading && hasMore) {
      loadPosts(currentThreadId, page + 1);
    }
  }, [currentThreadId, loading, hasMore, page, loadPosts]);

  // Create a new thread
  const createThread = useCallback(async (categoryId: number, title: string, content: string) => {
    if (!user) return null;
    
    try {
      const userId = parseInt(user.id);
      const thread = await socialService.createForumThread(categoryId, userId, title, content);
      
      if (thread) {
        // Refresh threads list
        await loadThreads(categoryId);
      }
      
      return thread;
    } catch (err) {
      console.error('Error creating thread:', err);
      return null;
    }
  }, [user, loadThreads]);

  // Create a new post
  const createPost = useCallback(async (threadId: number, content: string) => {
    if (!user) return null;
    
    try {
      const userId = parseInt(user.id);
      const post = await socialService.createForumPost(threadId, userId, content);
      
      if (post) {
        // Add post to current posts
        setPosts(prev => [...prev, post]);
      }
      
      return post;
    } catch (err) {
      console.error('Error creating post:', err);
      return null;
    }
  }, [user]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [subscription]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    categories,
    threads,
    posts,
    loading,
    error,
    hasMore,
    currentCategoryId,
    currentThreadId,
    loadCategories,
    loadThreads,
    loadMoreThreads,
    loadPosts,
    loadMorePosts,
    createThread,
    createPost,
    setCurrentCategoryId,
    setCurrentThreadId
  };
};