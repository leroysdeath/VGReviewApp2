import { useState, useEffect, useCallback } from 'react';
import { socialService } from '../services/socialService';
import { CommunityPoll, CommunityPollWithResults, PollOption } from '../types/social';
import { useAuth } from './useAuth';

export const usePolls = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<CommunityPollWithResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load community polls
  const loadPolls = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    setPage(pageNum);
    
    try {
      const userId = user ? parseInt(user.id) : undefined;
      const pollsData = await socialService.getPolls(pageNum, 20, userId);
      
      if (pageNum === 1) {
        setPolls(pollsData);
      } else {
        setPolls(prev => [...prev, ...pollsData]);
      }
      
      setHasMore(pollsData.length === 20); // Assuming 20 is the page size
    } catch (err) {
      console.error('Error loading community polls:', err);
      setError('Failed to load community polls');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load more polls
  const loadMorePolls = useCallback(() => {
    if (!loading && hasMore) {
      loadPolls(page + 1);
    }
  }, [loading, hasMore, page, loadPolls]);

  // Create a new poll
  const createPoll = useCallback(async (
    title: string,
    options: string[],
    isMultipleChoice = false,
    description?: string,
    groupId?: number,
    threadId?: number,
    closesAt?: string
  ) => {
    if (!user) return null;
    
    try {
      const userId = parseInt(user.id);
      const poll = await socialService.createPoll(
        userId,
        title,
        options,
        isMultipleChoice,
        description,
        groupId,
        threadId,
        closesAt
      );
      
      if (poll) {
        // Refresh polls list
        await loadPolls();
      }
      
      return poll;
    } catch (err) {
      console.error('Error creating poll:', err);
      return null;
    }
  }, [user, loadPolls]);

  // Vote on a poll
  const voteOnPoll = useCallback(async (pollId: number, optionId: number) => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      const success = await socialService.voteOnPoll(userId, pollId, optionId);
      
      if (success) {
        // Update local state
        setPolls(prev => 
          prev.map(poll => {
            if (poll.id === pollId) {
              // Find the option
              const option = poll.options.find(o => o.id === optionId);
              if (!option) return poll;
              
              // Calculate new vote counts and percentages
              const newTotalVotes = poll.total_votes + 1;
              const newOptions = poll.options.map(o => {
                if (o.id === optionId) {
                  const newVoteCount = o.vote_count + 1;
                  return {
                    ...o,
                    vote_count: newVoteCount,
                    percentage: Math.round((newVoteCount / newTotalVotes) * 100)
                  };
                } else {
                  // Recalculate percentage based on new total
                  return {
                    ...o,
                    percentage: Math.round((o.vote_count / newTotalVotes) * 100)
                  };
                }
              });
              
              return {
                ...poll,
                options: newOptions,
                total_votes: newTotalVotes,
                user_has_voted: true
              };
            }
            return poll;
          })
        );
      }
      
      return success;
    } catch (err) {
      console.error('Error voting on poll:', err);
      return false;
    }
  }, [user]);

  // Load polls on mount
  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  return {
    polls,
    loading,
    error,
    hasMore,
    loadPolls,
    loadMorePolls,
    createPoll,
    voteOnPoll
  };
};