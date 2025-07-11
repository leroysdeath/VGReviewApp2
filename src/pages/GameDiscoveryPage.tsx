import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { GameDiscoveryHub } from '../components/GameDiscoveryHub';
import { igdbService, Game } from '../services/igdbApi';
import { mockGames } from '../data/mockData';

export const GameDiscoveryPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Search games
  const handleSearch = async (query: string): Promise<Game[]> => {
    try {
      return await igdbService.searchGames(query);
    } catch (error) {
      console.error('Error searching games:', error);
      setError('Failed to search games. Please try again.');
      return [];
    }
  };

  // Get trending games
  const handleGetTrendingGames = async (): Promise<Game[]> => {
    try {
      return await igdbService.getPopularGames(10);
    } catch (error) {
      console.error('Error getting trending games:', error);
      setError('Failed to load trending games. Please try again.');
      return mockGames;
    }
  };

  // Get recommended games
  const handleGetRecommendedGames = async (preferences?: string[]): Promise<Game[]> => {
    try {
      // In a real app, this would use the preferences to get personalized recommendations
      return await igdbService.getPopularGames(12);
    } catch (error) {
      console.error('Error getting recommended games:', error);
      setError('Failed to load recommended games. Please try again.');
      return mockGames;
    }
  };

  // Get similar games
  const handleGetSimilarGames = async (gameId: string): Promise<Game[]> => {
    try {
      // In a real app, this would get games similar to the specified game
      // For now, we'll just return some mock games
      return mockGames.slice(0, 8);
    } catch (error) {
      console.error('Error getting similar games:', error);
      setError('Failed to load similar games. Please try again.');
      return [];
    }
  };

  // Get upcoming games
  const handleGetUpcomingGames = async (): Promise<Game[]> => {
    try {
      return await igdbService.getRecentGames(20);
    } catch (error) {
      console.error('Error getting upcoming games:', error);
      setError('Failed to load upcoming games. Please try again.');
      return mockGames;
    }
  };

  // Get games by genre
  const handleGetGamesByGenre = async (genreId: string): Promise<Game[]> => {
    try {
      // In a real app, this would get games by genre
      // For now, we'll just return some mock games
      return mockGames.slice(0, 6);
    } catch (error) {
      console.error('Error getting games by genre:', error);
      setError('Failed to load games by genre. Please try again.');
      return [];
    }
  };

  // Get games by mood
  const handleGetGamesByMood = async (moods: string[]): Promise<Game[]> => {
    try {
      // In a real app, this would get games matching the selected moods
      // For now, we'll just return some mock games
      return mockGames.slice(0, 8);
    } catch (error) {
      console.error('Error getting games by mood:', error);
      setError('Failed to load games by mood. Please try again.');
      return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <Helmet>
        <title>Game Discovery | GameVault</title>
        <meta name="description" content="Discover new games based on your preferences, compare games, browse by genre, and more." />
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Game Discovery</h1>
          <p className="text-gray-400">
            Find your next gaming adventure with our advanced discovery tools
          </p>
        </div>
        
        {error && (
          <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-6">
            <p>{error}</p>
          </div>
        )}
        
        <GameDiscoveryHub
          onSearch={handleSearch}
          onGetTrendingGames={handleGetTrendingGames}
          onGetRecommendedGames={handleGetRecommendedGames}
          onGetSimilarGames={handleGetSimilarGames}
          onGetUpcomingGames={handleGetUpcomingGames}
          onGetGamesByGenre={handleGetGamesByGenre}
          onGetGamesByMood={handleGetGamesByMood}
        />
      </div>
    </div>
  );
};