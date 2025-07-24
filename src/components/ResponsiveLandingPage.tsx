import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, Users, Gamepad2 } from 'lucide-react';

// Mock interfaces
interface Game {
  id: number;
  name: string;
  cover?: { url: string };
  first_release_date?: number;
  genres?: { name: string }[];
  platforms?: { name: string }[];
  rating?: number;
}

interface Review {
  id: string;
  userId: string;
  gameId: string;
  gameTitle: string;
  rating: number;
  text: string;
  date: string;
  hasText: boolean;
  author: string;
  authorAvatar: string;
  likeCount?: number;
  commentCount?: number;
}

// Simple GameCard component for fallback
const GameCard: React.FC<{ game: Game; compact?: boolean }> = ({ game, compact = false }) => (
  <div className={`bg-gray-800 rounded-lg p-4 ${compact ? 'h-48' : 'h-64'}`}>
    <div className="w-full h-32 bg-gray-700 rounded mb-3 flex items-center justify-center">
      <Gamepad2 className="h-8 w-8 text-gray-500" />
    </div>
    <h3 className="text-white font-medium text-sm truncate">{game.name}</h3>
    <p className="text-gray-400 text-xs">Action Game</p>
  </div>
);

// Simple ReviewCard component for fallback
const ReviewCard: React.FC<{ review: Review; compact?: boolean }> = ({ review, compact = false }) => (
  <div className={`bg-gray-800 rounded-lg p-4 ${compact ? 'h-32' : 'h-40'}`}>
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm">
        {review.author.charAt(0)}
      </div>
      <span className="text-white text-sm">{review.author}</span>
    </div>
    <p className="text-gray-300 text-sm line-clamp-2">{review.text}</p>
    <div className="flex items-center gap-1 mt-2">
      <Star className="h-4 w-4 text-yellow-400 fill-current" />
      <span className="text-yellow-400 text-sm">{review.rating}/10</span>
    </div>
  </div>
);

// Mock IGDB service for fallback
const mockIGDBService = {
  getPopularGames: async (limit: number = 6) => {
    return Array.from({ length: limit }, (_, i) => ({
      id: i + 1,
      name: `Popular Game ${i + 1}`,
      cover: { url: '/placeholder-game.jpg' },
      first_release_date: Date.now() / 1000,
      genres: [{ name: 'Action' }],
      platforms: [{ name: 'PC' }],
      rating: 8.0 + Math.random() * 2
    }));
  }
};

// Mock reviews data
const mockReviews: Review[] = [
  {
    id: '1',
    userId: '1',
    gameId: '1',
    gameTitle: 'Sample Game',
    rating: 9,
    text: 'Great game with excellent gameplay and story!',
    date: '2024-01-15',
    hasText: true,
    author: 'GamerPro',
    authorAvatar: '/avatar1.jpg',
    likeCount: 15,
    commentCount: 3
  },
  {
    id: '2',
    userId: '2',
    gameId: '2',
    gameTitle: 'Another Game',
    rating: 8,
    text: 'Solid gameplay but could use better graphics.',
    date: '2024-01-14',
    hasText: true,
    author: 'GameFan',
    authorAvatar: '/avatar2.jpg',
    likeCount: 8,
    commentCount: 1
  }
];

// Simple hook replacement
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return { isMobile };
};

export const ResponsiveLandingPage: React.FC = () => {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const { isMobile } = useResponsive();
  const recentReviews = mockReviews.slice(0, isMobile ? 3 : 4);

  useEffect(() => {
    const loadFeaturedGames = async () => {
      try {
        const games = await mockIGDBService.getPopularGames(isMobile ? 4 : 6);
        setFeaturedGames(games);
      } catch (error) {
        console.error('Failed to load featured games:', error);
        setFeaturedGames(await mockIGDBService.getPopularGames(isMobile ? 4 : 6));
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
              Rate, review, and discover games through social gaming.
            </p>
          </div>
        </div>

        {/* Mobile Features Section */}
        <div className="px-4 py-12 bg-gray-800">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-3">Why GameVault?</h2>
            <p className="text-gray-400">The social gaming platform built for enthusiasts</p>
          </div>
          <div className="space-y-6">
            <div className="text-center p-6 bg-gray-700 rounded-lg">
              <Star className="h-10 w-10 text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Precise Ratings</h3>
              <p className="text-gray-400 text-sm">Rate games on a 1-10 scale with half-point precision.</p>
            </div>
            <div className="text-center p-6 bg-gray-700 rounded-lg">
              <Users className="h-10 w-10 text-blue-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Social Discovery</h3>
              <p className="text-gray-400 text-sm">Follow gamers with similar tastes and discover games.</p>
            </div>
            <div className="text-center p-6 bg-gray-700 rounded-lg">
              <TrendingUp className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Personal Stats</h3>
              <p className="text-gray-400 text-sm">Track your gaming journey with detailed statistics.</p>
            </div>
          </div>
        </div>

        {/* Mobile Featured Games Section */}
        <div className="px-4 py-12 bg-gray-900">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Featured Games</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                  <div className="w-full h-32 bg-gray-700 rounded mb-3"></div>
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {featuredGames.map((game) => (
                <GameCard key={game.id} game={game} compact />
              ))}
            </div>
          )}
        </div>

        {/* Mobile Recent Reviews */}
        <div className="px-4 py-12 bg-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Reviews</h2>
          <div className="space-y-4">
            {recentReviews.map((review) => (
              <ReviewCard key={review.id} review={review} compact />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Desktop Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-8">
            <Gamepad2 className="h-16 w-16 text-purple-400" />
          </div>
          <h1 className="text-6xl font-bold text-white mb-6">
            Discover Your Next
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 block">
              Gaming Adventure
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join the ultimate gaming community where passionate players discover, rate, and review games. 
            Your next favorite gaming experience is just one click away.
          </p>
        </div>
      </div>

      {/* Desktop Features Section */}
      <div className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why GameVault?</h2>
            <p className="text-xl text-gray-400">The social gaming platform built for enthusiasts</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                  <div className="w-full h-48 bg-gray-700 rounded mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
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
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Recent Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
