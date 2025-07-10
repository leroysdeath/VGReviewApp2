// Enhanced games hook with IGDB integration
import { useState, useEffect, useCallback } from 'react';
import { igdbService, Game } from '../services/igdbService';

export const useEnhancedGames = () => {
  const [games, setGames] = useState<Game[]>([]);
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
      const results = await igdbService.searchGames(query);
      setGames(results);
      
      // Sync popular games to database
      if (results.length > 0) {
        results.slice(0, 5).forEach(game => {
          igdbService.syncGameToDatabase(game).catch(console.error);
        });
      }
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
      const results = await igdbService.getPopularGames(limit);
      setGames(results);
      
      // Sync to database
      results.forEach(game => {
        igdbService.syncGameToDatabase(game).catch(console.error);
      });
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
      const results = await igdbService.getRecentGames(limit);
      setGames(results);
      
      // Sync to database
      results.forEach(game => {
        igdbService.syncGameToDatabase(game).catch(console.error);
      });
    } catch (err) {
      setError('Failed to load recent games');
      console.error('Recent games error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getGameById = useCallback(async (id: string): Promise<Game | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const game = await igdbService.getGameById(id);
      if (game) {
        // Sync to database
        await igdbService.syncGameToDatabase(game);
      }
      return game;
    } catch (err) {
      setError('Failed to load game');
      console.error('Get game error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    igdbService.clearCache();
  }, []);

  return {
    games,
    loading,
    error,
    searchGames,
    getPopularGames,
    getRecentGames,
    getGameById,
    clearCache
  };
};