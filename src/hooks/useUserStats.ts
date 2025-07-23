import { useState, useEffect } from 'react';
import { getUserStats, UserStats } from '../services/followService';

interface UseUserStatsReturn {
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

/**
 * Hook for managing user statistics
 */
export const useUserStats = (userId: string | null): UseUserStatsReturn => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    if (!userId) {
      setStats(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { stats: userStats, error: statsError } = await getUserStats(userId);
      
      if (statsError) {
        setError(statsError);
        setStats(null);
      } else {
        setStats(userStats);
      }
    } catch (err) {
      console.error('Error loading user stats:', err);
      setError('Failed to load user statistics');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Load stats when userId changes
  useEffect(() => {
    loadStats();
  }, [userId]);

  const refreshStats = async () => {
    await loadStats();
  };

  return {
    stats,
    loading,
    error,
    refreshStats
  };
};
