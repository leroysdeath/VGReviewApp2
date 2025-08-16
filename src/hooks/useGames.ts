import { useState, useCallback } from 'react';
import { supabaseHelpers } from '../services/supabase';

export const useGames = () => {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGames = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const searchResults = await supabaseHelpers.searchGames(query);
      // Transform to expected format
      const transformedGames = (searchResults || []).map((game: any) => ({
        id: game.id.toString(),
        title: game.name,
        coverImage: game.pic_url || '/default-cover.png',
        releaseDate: game.release_date || '',
        genre: game.genre || '',
        rating: 0,
        description: game.description || '',
        developer: game.developer || '',
        publisher: game.publisher || ''
      }));
      setGames(transformedGames);
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
      const popularGames = await supabaseHelpers.getPopularGames();
      // Transform to expected format
      const transformedGames = (popularGames || []).map((game: any) => ({
        id: game.id.toString(),
        title: game.name,
        coverImage: game.pic_url || '/default-cover.png',
        releaseDate: game.release_date || '',
        genre: game.genre || '',
        rating: 0,
        description: game.description || '',
        developer: game.developer || '',
        publisher: game.publisher || ''
      }));
      setGames(transformedGames);
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
      // For recent games, use getPopularGames as Supabase doesn't have getRecentGames
      const recentGames = await supabaseHelpers.getPopularGames();
      // Transform to expected format
      const transformedGames = (recentGames || []).map((game: any) => ({
        id: game.id.toString(),
        title: game.name,
        coverImage: game.pic_url || '/default-cover.png',
        releaseDate: game.release_date || '',
        genre: game.genre || '',
        rating: 0,
        description: game.description || '',
        developer: game.developer || '',
        publisher: game.publisher || ''
      }));
      setGames(transformedGames);
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