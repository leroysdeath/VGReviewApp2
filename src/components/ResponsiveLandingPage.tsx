import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, TrendingUp, Users, Search, ArrowRight, Gamepad2 } from 'lucide-react';
import { GameCard } from './GameCard';
import { ReviewCard } from './ReviewCard';
import { mockReviews } from '../data/mockData';
import { igdbService, Game } from '../services/igdbApi';
import { useResponsive } from '../hooks/useResponsive';

export const ResponsiveLandingPage: React.FC = () => {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const { isMobile } = useResponsive();
  const recentReviews = mockReviews.slice(0, isMobile ? 3 : 4);

  useEffect(() => {
    const loadFeaturedGames = async () => {
      try {
        const games = await igdbService.getPopularGames(isMobile ? 4 : 6);
        setFeaturedGames(games);
      } catch (error) {
        console.error('Failed to load featured games:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedGames();
  }, [isMobile]);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-900">
        {/* Mobile Hero Section */}
        <div className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-gray-900 px-4 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Gamepad2 className="h-12 w-12 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Discover Your Next
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 block">
                Gaming Adventure
              </span>
            </h1>
            <p className="text-gray-300 mb-8 leading-relaxed">
              Join the ultimate gaming community. Rate, review, and discover games through social gaming.
            </p>

            {/* Mobile CTA Buttons */}
            <div className="space-y-4">
              <Link
                to="/search"
                className="block w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
              >
                <Search className="inline h-5 w-5 mr-2" />
                Start Exploring
              </Link>
              <Link
                to="/users"
                className="block w-full bg-gray-800 text-gray-200 py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                <Users className="inline h-5 w-5 mr-2" />
                Join Community
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Featured Games */}
        <section className="px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Trending Games</h2>
            <Link to="/search" className="text-purple-400 text-sm font-medium hover:text-purple-300">
              View All →
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                  <div className="aspect-[3/4] bg-gray-700 rounded-lg mb-3"></div>
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {featuredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  showActions={false}
                  className="h-full"
                />
              ))}
            </div>
          )}
        </section>

        {/* Mobile Recent Reviews */}
        <section className="px-4 py-8 bg-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Latest Reviews</h2>
            <Link to="/reviews" className="text-purple-400 text-sm font-medium hover:text-purple-300">
              View All →
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                compact={true}
              />
            ))}
          </div>
        </section>

        {/* Mobile Community Stats */}
        <section className="px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-6">Join Our Community</h2>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">50K+</div>
                <div className="text-gray-400 text-sm">Games</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">125K+</div>
                <div className="text-gray-400 text-sm">Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">25K+</div>
                <div className="text-gray-400 text-sm">Users</div>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-gray-900"></div>
        
        {/* Floating orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500 rounded-full opacity-20 blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-blue-500 rounded-full opacity-30 blur-lg animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-purple-400 rounded-full opacity-25 blur-lg animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <Gamepad2 className="h-16 w-16 text-purple-400 mx-auto mb-6" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Discover Your Next
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Gaming Adventure
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join the ultimate gaming community. Rate, review, and discover games through the 
            power of social gaming. Your next favorite game is just a click away.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/search"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
            >
              <Search className="mr-2 h-5 w-5" />
              Start Exploring
            </Link>
            <Link
              to="/users"
              className="inline-flex items-center px-8 py-4 bg-gray-800 text-gray-200 text-lg font-semibold rounded-lg hover:bg-gray-700 transition-colors transform hover:scale-105"
            >
              <Users className="mr-2 h-5 w-5" />
              Join Community
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Games Section */}
      <section className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-purple-400 mr-3" />
              <h2 className="text-4xl font-bold text-white">Trending Games</h2>
            </div>
            <p className="text-xl text-gray-400">Discover what the community is playing right now</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-6 animate-pulse">
                  <div className="aspect-[3/4] bg-gray-600 rounded-lg mb-4"></div>
                  <div className="h-6 bg-gray-600 rounded mb-2"></div>
                  <div className="h-4 bg-gray-600 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  showActions={true}
                  className="h-full transform hover:scale-105 transition-transform duration-200"
                />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/search"
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
            >
              View All Games
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Reviews Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Star className="h-8 w-8 text-yellow-400 mr-3" />
              <h2 className="text-4xl font-bold text-white">Latest Reviews</h2>
            </div>
            <p className="text-xl text-gray-400">See what the community thinks about the latest games</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {recentReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                compact={false}
                className="transform hover:scale-105 transition-transform duration-200"
              />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/reviews"
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
            >
              View All Reviews
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Community Stats Section */}
      <section className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Join Our Growing Community</h2>
            <p className="text-xl text-gray-400">Be part of the world's largest gaming community</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-8 bg-gray-700 rounded-lg">
              <div className="text-4xl font-bold text-purple-400 mb-2">50,000+</div>
              <div className="text-gray-300 text-lg">Games Reviewed</div>
            </div>
            <div className="text-center p-8 bg-gray-700 rounded-lg">
              <div className="text-4xl font-bold text-blue-400 mb-2">125,000+</div>
              <div className="text-gray-300 text-lg">User Reviews</div>
            </div>
            <div className="text-center p-8 bg-gray-700 rounded-lg">
              <div className="text-4xl font-bold text-green-400 mb-2">25,000+</div>
              <div className="text-gray-300 text-lg">Active Members</div>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
            >
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
