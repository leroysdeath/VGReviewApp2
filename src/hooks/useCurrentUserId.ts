import { useState, useEffect } from 'react';
import { getCurrentUserId } from '../services/reviewService';
import { useAuth } from './useAuth';

/**
 * Custom hook to get the current user's database ID (not auth.uid)
 * Maps auth.uid → user.provider_id → user.id
 */
export const useCurrentUserId = () => {
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const fetchUserId = async () => {
      if (!isAuthenticated || !user) {
        setUserId(null);
        return;
      }

      setLoading(true);
      try {
        const dbUserId = await getCurrentUserId();
        setUserId(dbUserId);
      } catch (error) {
        console.error('Error fetching user database ID:', error);
        setUserId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
  }, [isAuthenticated, user]);

  return { userId, loading };
};
