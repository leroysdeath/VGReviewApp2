// Enhanced games hook with Supabase integration
import { useState, useCallback } from 'react';
import { gameDataService } from '../services/gameDataService';
import type { GameWithCalculatedFields } from '../types/database';

export const useEnhancedGames = () => {
  const [games, setGames] = useState<GameWithCalculatedFields[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGames = useCallback(async (query: string) => {
    if (!query.trim()) {
      setGames([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const results = await gameDataService.searchGames(query);
      setGames(results);
    } catch (err) {
      setError('Failed to search games');
      console.error('Search games error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPopularGames = useCallback(async (limit = 20) => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await gameDataService.getPopularGames(limit);
      setGames(results);
    } catch (err) {
      setError('Failed to load popular games');
      console.error('Popular games error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecentGames = useCallback(async (limit = 20) => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await gameDataService.getRecentGames(limit);
      setGames(results);
    } catch (err) {
      setError('Failed to load recent games');
      console.error('Recent games error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getGameById = useCallback(async (id: string): Promise<GameWithCalculatedFields | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const game = await gameDataService.getGameById(parseInt(id));
      return game;
    } catch (err) {
      setError('Failed to load game');
      console.error('Get game error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    games,
    loading,
    error,
    searchGames,
    getPopularGames,
    getRecentGames,
    getGameById
  };
};