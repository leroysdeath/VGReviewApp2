import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, TrendingUp, Users, Search, ArrowRight, Gamepad2 } from 'lucide-react';
import { GameCard } from '../components/GameCard';
import { ReviewCard } from '../components/ReviewCard';
import { mockReviews } from '../data/mockData';
import { igdbService, Game } from '../services/igdbApi';

export const LandingPage: React.FC = () => {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const recentReviews = mockReviews.slice(0, 4);

  useEffect(() => {
    const loadFeaturedGames = async () => {
      try {
        const games = await igdbService.getPopularGames(6);
        setFeaturedGames(games);
      } catch (error) {
        console.error('Failed to load featured games:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedGames();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-gray-900 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Discover Your Next
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                {' '}Gaming Adventure
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Join the ultimate gaming community. Rate, review, and discover games 
              through the power of social gaming. Your next favorite game is just a click away.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/search"
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-lg font-medium"
              >
                <Search className="h-5 w-5" />
                Explore Games
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 bg-transparent border-2 border-purple-400 text-purple-400 rounded-lg hover:bg-purple-400 hover:text-white transition-colors flex items-center gap-2 text-lg font-medium"
              >
                Join Community
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why GameVault?</h2>
            <p className="text-gray-400 text-lg">The social gaming platform built for enthusiasts</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <Star className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Precise Ratings</h3>
              <p className="text-gray-400">Rate games on a 1-10 scale with half-point precision. Your opinions matter.</p>
            </div>
            <div className="text-center p-6 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <Users className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Social Discovery</h3>
              <p className="text-gray-400">Follow gamers with similar tastes and discover your next favorite game.</p>
            </div>
            <div className="text-center p-6 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <TrendingUp className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Personal Stats</h3>
              <p className="text-gray-400">Track your gaming journey with detailed statistics and personal lists.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Games Section */}
      <div className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">Featured Games</h2>
            <Link
              to="/search"
              className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-gray-700"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-2/3 mb-3"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Reviews Section */}
      <div className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">Recent Reviews</h2>
            <Link
              to="/users"
              className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {recentReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};