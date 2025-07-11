import { useState, useEffect, useCallback } from 'react';
import { socialService } from '../services/socialService';
import { UserGroup, GroupMember } from '../types/social';
import { useAuth } from './useAuth';

export const useGroups = () => {
  const { user } = useAuth();
  const [myGroups, setMyGroups] = useState<UserGroup[]>([]);
  const [publicGroups, setPublicGroups] = useState<UserGroup[]>([]);
  const [currentGroup, setCurrentGroup] = useState<UserGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load user's groups
  const loadMyGroups = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userId = parseInt(user.id);
      const groupsData = await socialService.getUserGroups(userId);
      
      setMyGroups(groupsData);
    } catch (err) {
      console.error('Error loading user groups:', err);
      setError('Failed to load your groups');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load public groups
  const loadPublicGroups = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    setPage(pageNum);
    
    try {
      const groupsData = await socialService.getPublicGroups(pageNum);
      
      if (pageNum === 1) {
        setPublicGroups(groupsData);
      } else {
        setPublicGroups(prev => [...prev, ...groupsData]);
      }
      
      setHasMore(groupsData.length === 20); // Assuming 20 is the page size
    } catch (err) {
      console.error('Error loading public groups:', err);
      setError('Failed to load public groups');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more public groups
  const loadMorePublicGroups = useCallback(() => {
    if (!loading && hasMore) {
      loadPublicGroups(page + 1);
    }
  }, [loading, hasMore, page, loadPublicGroups]);

  // Create a new group
  const createGroup = useCallback(async (name: string, description: string, isPrivate: boolean) => {
    if (!user) return null;
    
    try {
      const userId = parseInt(user.id);
      const group = await socialService.createUserGroup(userId, name, description, isPrivate);
      
      if (group) {
        // Refresh groups list
        await loadMyGroups();
      }
      
      return group;
    } catch (err) {
      console.error('Error creating group:', err);
      return null;
    }
  }, [user, loadMyGroups]);

  // Join a group
  const joinGroup = useCallback(async (groupId: number) => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      const success = await socialService.joinGroup(userId, groupId);
      
      if (success) {
        // Refresh groups list
        await loadMyGroups();
      }
      
      return success;
    } catch (err) {
      console.error('Error joining group:', err);
      return false;
    }
  }, [user, loadMyGroups]);

  // Leave a group
  const leaveGroup = useCallback(async (groupId: number) => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      const success = await socialService.leaveGroup(userId, groupId);
      
      if (success) {
        // Refresh groups list
        await loadMyGroups();
      }
      
      return success;
    } catch (err) {
      console.error('Error leaving group:', err);
      return false;
    }
  }, [user, loadMyGroups]);

  // Check if user is in a group
  const isInGroup = useCallback((groupId: number) => {
    return myGroups.some(group => group.id === groupId);
  }, [myGroups]);

  // Load groups on mount
  useEffect(() => {
    if (user) {
      loadMyGroups();
      loadPublicGroups();
    }
  }, [user, loadMyGroups, loadPublicGroups]);

  return {
    myGroups,
    publicGroups,
    currentGroup,
    groupMembers,
    loading,
    error,
    hasMore,
    loadMyGroups,
    loadPublicGroups,
    loadMorePublicGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    isInGroup,
    setCurrentGroup
  };
};