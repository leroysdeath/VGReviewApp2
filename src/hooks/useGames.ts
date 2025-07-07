import { useState, useCallback } from 'react';
import { mockGames } from '../data/mockData';

export interface Game {
  id: number;
  title: string;
  developer: string;
  publisher: string;
  releaseDate: string;
  genre: string[];
  platforms: string[];
  rating: number;
  reviewCount: number;
  price: number;
  description: string;
  screenshots: string[];
  coverImage: string;
}

export const useGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGames = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Filter games based on search query
      const filteredGames = mockGames.filter(game =>
        game.title.toLowerCase().includes(query.toLowerCase()) ||
        game.developer.toLowerCase().includes(query.toLowerCase()) ||
        game.publisher.toLowerCase().includes(query.toLowerCase()) ||
        game.genre.some(g => g.toLowerCase().includes(query.toLowerCase())) ||
        game.description.toLowerCase().includes(query.toLowerCase())
      );

      setGames(filteredGames);
    } catch (err) {
      setError('Failed to search games');
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllGames = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      setGames(mockGames);
    } catch (err) {
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    games,
    loading,
    error,
    searchGames,
    getAllGames
  };
};