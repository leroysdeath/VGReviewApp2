import { useState, useCallback } from 'react';
import { igdbService, Game } from '../services/igdbApi';

export const useGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGames = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const searchResults = await igdbService.searchGames(query);
      setGames(searchResults);
    } catch (err) {
      setError('Failed to search games. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllGames = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const popularGames = await igdbService.getPopularGames();
      setGames(popularGames);
    } catch (err) {
      setError('Failed to load games. Please try again.');
      console.error('Load games error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecentGames = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const recentGames = await igdbService.getPopularGames(10);
      setGames(recentGames);
    } catch (err) {
      setError('Failed to load recent games. Please try again.');
      console.error('Load recent games error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    games,
    loading,
    error,
    searchGames,
    getAllGames,
    getRecentGames
  };
};