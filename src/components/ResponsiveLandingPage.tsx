import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, TrendingUp, Users, User, Search, ArrowRight, Gamepad2, Square, CheckSquare } from 'lucide-react';
import { ReviewCard, ReviewData } from './ReviewCard';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../context/AuthModalContext';
import { getReviews, Review } from '../services/reviewService';
import { useLikeStore } from '../store/useLikeStore';

// Custom component for the spinning number animation
const SpinningNumber: React.FC<{ isHovered: boolean }> = ({ isHovered }) => {
  return (
    <div className="relative w-12 h-12 mx-auto mb-4 overflow-hidden" style={{ perspective: '1000px' }}>
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 backface-hidden`}
        style={{ 
          transform: isHovered ? 'rotateY(180deg)' : 'rotateY(0deg)',
          backfaceVisibility: 'hidden'
        }}
      >
        <span className="text-4xl font-bold text-purple-400">1</span>
      </div>
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 backface-hidden`}
        style={{ 
          transform: isHovered ? 'rotateY(360deg)' : 'rotateY(180deg)',
          backfaceVisibility: 'hidden'
        }}
      >
        <span className="text-4xl font-bold text-purple-400">10</span>
      </div>
    </div>
  );
};

// Custom component for the splitting user icon animation
const SplittingUsers: React.FC<{ isHovered: boolean; size?: 'small' | 'large' }> = ({ isHovered, size = 'large' }) => {
  const iconSize = size === 'small' ? 'h-10 w-10' : 'h-12 w-12';
  const containerHeight = size === 'small' ? 'h-10' : 'h-12';
  const marginBottom = size === 'small' ? 'mb-3' : 'mb-4';
  
  return (
    <div className={`relative ${containerHeight} w-24 mx-auto ${marginBottom} flex items-center justify-center`}>
      {/* Single center user that fades out on hover */}
      <div 
        className={`absolute transition-all duration-500 ${isHovered ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
      >
        <User className={`${iconSize} text-blue-400`} />
      </div>
      
      {/* Three users that split apart on hover */}
      <div 
        className={`absolute transition-all duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: isHovered ? 'translateX(-24px)' : 'translateX(0)' }}
      >
        <User className={`${iconSize} text-blue-400 scale-90`} />
      </div>
      <div 
        className={`absolute transition-all duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
      >
        <User className={`${iconSize} text-blue-400`} />
      </div>
      <div 
        className={`absolute transition-all duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: isHovered ? 'translateX(24px)' : 'translateX(0)' }}
      >
        <User className={`${iconSize} text-blue-400 scale-90`} />
      </div>
    </div>
  );
};

// Custom component for the cascading checkbox animation
const CascadingCheckboxes: React.FC<{ isHovered: boolean; size?: 'small' | 'large' }> = ({ isHovered, size = 'large' }) => {
  const iconSize = size === 'small' ? 'h-6 w-6' : 'h-7 w-7';
  const containerSize = size === 'small' ? 'h-14 w-24' : 'h-16 w-28';
  const marginBottom = size === 'small' ? 'mb-3' : 'mb-4';
  const spacing = size === 'small' ? 24 : 28;
  
  // Grid positions for 3x2 layout
  // We offset everything so the final grid is centered
  // Layout:
  // [5] [4] [3]
  // [6] [1] [2]
  // Checkbox 1 is at center-bottom of the grid, so we offset by half spacing to center the whole grid
  const offsetX = -spacing / 2;
  const offsetY = spacing / 2;
  
  const positions = [
    { x: offsetX, y: offsetY, delay: 0 },      // 1: Center bottom (original)
    { x: offsetX + spacing, y: offsetY, delay: 200 },  // 2: Right bottom
    { x: offsetX + spacing, y: offsetY - spacing, delay: 400 },  // 3: Right top
    { x: offsetX, y: offsetY - spacing, delay: 600 }, // 4: Center top
    { x: offsetX - spacing, y: offsetY - spacing, delay: 800 }, // 5: Left top
    { x: offsetX - spacing, y: offsetY, delay: 1000 }    // 6: Left bottom
  ];
  
  return (
    <div className={`relative ${containerSize} mx-auto ${marginBottom} flex items-center justify-center`}>
      {/* Empty checkbox when not hovered */}
      <div 
        className={`absolute transition-all duration-300 ${!isHovered ? 'opacity-100' : 'opacity-0'}`}
      >
        <Square className={`${iconSize} text-green-400`} />
      </div>
      
      {/* Animated checkboxes that appear on hover */}
      {positions.map((pos, index) => (
        <div
          key={index}
          className={`absolute transition-all ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            transitionDelay: isHovered ? `${pos.delay}ms` : '0ms',
            transitionDuration: '300ms'
          }}
        >
          {/* Empty checkbox that appears first */}
          <Square 
            className={`${iconSize} text-green-400 absolute transition-opacity duration-300`}
            style={{
              opacity: isHovered ? 1 : 0,
              transitionDelay: isHovered ? `${pos.delay}ms` : '0ms'
            }}
          />
          {/* Filled checkbox that appears after */}
          <CheckSquare 
            className={`${iconSize} text-green-400 absolute transition-opacity duration-300`}
            style={{
              opacity: isHovered ? 1 : 0,
              transitionDelay: isHovered ? `${pos.delay + 150}ms` : '0ms'
            }}
          />
        </div>
      ))}
    </div>
  );
};

export const ResponsiveLandingPage: React.FC = () => {
  const [recentReviews, setRecentReviews] = useState<ReviewData[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const { isMobile } = useResponsive();
  const { isAuthenticated, user } = useAuth();
  const { openModal } = useAuthModal();
  const navigate = useNavigate();
  const loadBulkStatus = useLikeStore(state => state.loadBulkStatus);
  
  // Helper function to get reliable IGDB ID for URL generation
  const getReliableIgdbId = (review: Review): string => {
    // Priority 1: Use rating.igdb_id (most reliable for URL generation)
    if ((review as any).igdb_id) {
      return (review as any).igdb_id.toString();
    }
    
    // Priority 2: Use game.igdb_id if available
    if ((review.game as any)?.igdb_id) {
      console.warn('⚠️ Using game.igdb_id as fallback for review', review.id);
      return (review.game as any).igdb_id.toString();
    }
    
    // Priority 3: Use game.game_id (may cause lookup issues)
    if ((review.game as any)?.game_id) {
      console.warn('⚠️ Using game.game_id as fallback for review', review.id);
      return (review.game as any).game_id;
    }
    
    // Last resort: database game_id
    console.error('❌ No IGDB ID available for review', review.id);
    return review.gameId.toString();
  };

  // Transform Review to ReviewData interface
  const transformReviewData = (review: Review): ReviewData => {
    const theme: ReviewData['theme'] = ['purple', 'green', 'orange', 'blue', 'red'][review.id % 5] as ReviewData['theme'];
    
    // Debug logging to understand the data structure
    console.log('🔍 Transforming review:', {
      reviewId: review.id,
      userId: review.userId,
      gameId: review.gameId,
      reviewIgdbId: (review as any).igdb_id,
      game: review.game,
      gameIgdbId: (review.game as any)?.igdb_id,
      gameGameId: (review.game as any)?.game_id,
    });
    
    const igdbId = getReliableIgdbId(review);
    console.log('📍 Final IGDB ID for routing:', igdbId);
    
    return {
      id: review.id.toString(),
      userId: review.userId.toString(),
      gameId: review.gameId.toString(),
      // Use the game's igdb_id (integer) for proper navigation, fallback to game_id (string), then database id
      igdbGameId: igdbId,
      gameTitle: review.game?.name || 'Unknown Game',
      gameCoverUrl: review.game?.cover_url,
      rating: review.rating,
      text: review.review || '',
      date: review.postDateTime,
      hasText: !!review.review && review.review.trim().length > 0,
      author: review.user?.name || 'Anonymous',
      authorAvatar: review.user?.avatar_url || '',
      likeCount: review.likeCount || 0,
      commentCount: review.commentCount || 0,
      theme
    };
  };
  
  // Load recent reviews
  useEffect(() => {
    const loadRecentReviews = async () => {
      try {
        setReviewsLoading(true);
        setReviewsError(null);
        
        const result = await getReviews(10); // Get up to 10 recent reviews
        
        if (result.success && result.data) {
          const transformedReviews = result.data.map(transformReviewData);
          // Limit based on screen size
          const limitedReviews = transformedReviews.slice(0, isMobile ? 3 : 4);
          setRecentReviews(limitedReviews);
          
          // Load bulk like statuses for all reviews
          if (limitedReviews.length > 0) {
            const ratingIds = limitedReviews.map(r => parseInt(r.id));
            await loadBulkStatus(user?.id, ratingIds);
          }
        } else {
          setReviewsError(result.error || 'Failed to load reviews');
        }
      } catch (error) {
        console.error('Failed to load recent reviews:', error);
        setReviewsError('Failed to load reviews');
      } finally {
        setReviewsLoading(false);
      }
    };
    
    loadRecentReviews();
  }, [isMobile, user?.id, loadBulkStatus]);


  // Handle join community button click
  const handleJoinCommunity = () => {
    if (!isAuthenticated) {
      openModal(); // Use global auth modal
      return;
    }
    // Navigate to users page if already authenticated
    navigate('/users');
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-900">
        {/* Mobile Hero Section */}
        <div className="relative bg-gray-900 overflow-hidden px-4 py-12">
          {/* Simplified multi-layered background for mobile */}
          {/* Layer 1: Subtle gradient */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse at top, rgba(147, 51, 234, 0.12) 0%, transparent 50%),
                radial-gradient(ellipse at bottom, rgba(59, 130, 246, 0.08) 0%, transparent 50%)
              `
            }}
          />
          
          {/* Layer 2: Single animated orb for performance */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
          </div>
          
          {/* Layer 3: Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/30" />
          
          {/* Content */}
          <div className="relative text-center">
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
              Rate, review, and discover games through the power of social gaming.
            </p>
            <div className="space-y-3">
              <Link
                to="/search"
                className="group relative block w-full overflow-hidden rounded-lg"
              >
                {/* Glassmorphism background */}
                <div className="absolute inset-0 bg-purple-600/20 backdrop-blur-sm border border-purple-500/30 rounded-lg" />
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-purple-700/30 opacity-0 group-active:opacity-100 transition-opacity duration-300" />
                
                {/* Content */}
                <div className="relative px-6 py-3 text-white font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <Search className="h-5 w-5" />
                    Explore Games
                  </div>
                </div>
              </Link>
              {isAuthenticated ? (
                <Link
                  to="/users"
                  className="group relative block w-full overflow-hidden rounded-lg"
                >
                  {/* Glassmorphism background */}
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-sm border border-purple-400/50 rounded-lg" />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 opacity-0 group-active:opacity-100 transition-opacity duration-300" />
                  
                  {/* Content */}
                  <div className="relative px-6 py-3 text-purple-300 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      Browse Community
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>
              ) : (
                <button
                  onClick={handleJoinCommunity}
                  className="group relative block w-full overflow-hidden rounded-lg"
                >
                  {/* Glassmorphism background */}
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-sm border border-purple-400/50 rounded-lg" />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 opacity-0 group-active:opacity-100 transition-opacity duration-300" />
                  
                  {/* Content */}
                  <div className="relative px-6 py-3 text-purple-300 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      Join Community
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Features Section */}
        <div className="px-4 py-12 bg-gray-800">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-3">GameVault</h2>
            <p className="text-gray-400">The social gaming platform built for enthusiasts</p>
          </div>
          <div className="space-y-6">
            <div 
              className="relative text-center p-6 bg-gray-900/80 backdrop-blur-lg rounded-lg transition-all duration-300 hover:bg-gray-900/90 group overflow-hidden"
              onMouseEnter={() => setHoveredCard('ratings-mobile')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="transform transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                  <SpinningNumber isHovered={hoveredCard === 'ratings-mobile'} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 transition-colors duration-300 group-hover:text-purple-300">Precise Ratings</h3>
                <p className="text-gray-400 text-sm transition-all duration-300 group-hover:text-gray-300">
                  Rate games on a 1-10 scale. Your opinions matter.
                </p>
              </div>
            </div>
            <div 
              className="relative text-center p-6 bg-gray-900/80 backdrop-blur-lg rounded-lg transition-all duration-300 hover:bg-gray-900/90 group overflow-hidden"
              onMouseEnter={() => setHoveredCard('social-mobile')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/10 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="transform transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                  <SplittingUsers isHovered={hoveredCard === 'social-mobile'} size="small" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 transition-colors duration-300 group-hover:text-blue-300">Social Discovery</h3>
                <p className="text-gray-400 text-sm transition-all duration-300 group-hover:text-gray-300">
                  Follow gamers with similar tastes. Or because they're funny.
                </p>
              </div>
            </div>
            <div 
              className="relative text-center p-6 bg-gray-900/80 backdrop-blur-lg rounded-lg transition-all duration-300 hover:bg-gray-900/90 group overflow-hidden"
              onMouseEnter={() => setHoveredCard('stats-mobile')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/0 via-green-600/10 to-green-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="transform transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                  <CascadingCheckboxes isHovered={hoveredCard === 'stats-mobile'} size="small" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 transition-colors duration-300 group-hover:text-green-300">Personal Stats</h3>
                <p className="text-gray-400 text-sm transition-all duration-300 group-hover:text-gray-300">
                  Track your gaming journey. Add games to your Wishlist, Collection, and more.
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* Mobile Recent Reviews Section */}
        <div className="px-4 py-12 bg-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Reviews</h2>
            <Link
              to="/users"
              className="text-purple-400 hover:text-purple-300 transition-colors text-sm flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {reviewsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-gray-700 rounded-lg overflow-hidden animate-pulse">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-600 rounded mb-2 w-3/4"></div>
                        <div className="h-3 bg-gray-600 rounded mb-3 w-1/2"></div>
                        <div className="h-3 bg-gray-600 rounded w-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : reviewsError ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-2">Failed to load recent reviews</p>
              <p className="text-sm text-gray-500">{reviewsError}</p>
            </div>
          ) : recentReviews.length > 0 ? (
            <div className="space-y-4">
              {recentReviews.map((review) => (
                <ReviewCard key={review.id} review={review} compact currentUserId={user?.id} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No recent reviews yet</p>
              <p className="text-sm text-gray-500 mt-2">Be the first to share your gaming experience!</p>
            </div>
          )}
        </div>

      </div>
    );
  }

  // Desktop version
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative bg-gray-900 overflow-hidden">
        {/* Multi-layered background */}
        {/* Layer 1: Base gradient - subtle radial gradients */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% 0%, rgba(147, 51, 234, 0.15) 0%, transparent 40%),
              radial-gradient(ellipse 60% 50% at 80% 0%, rgba(59, 130, 246, 0.12) 0%, transparent 40%),
              radial-gradient(ellipse 90% 70% at 50% 100%, rgba(139, 92, 246, 0.08) 0%, transparent 40%)
            `
          }}
        />
        
        {/* Layer 2: Animated floating orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
        </div>
        
        {/* Layer 3: Subtle noise/grain overlay for texture */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}
        />
        
        {/* Layer 4: Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/20 to-gray-900/50" />
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Discover Your Next
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                {' '}Gaming Adventure
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Rate, review, and discover games through the power of social gaming.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/search"
                className="group relative px-8 py-3 text-white rounded-lg flex items-center gap-2 text-lg font-medium overflow-hidden transition-all duration-300 hover:scale-105"
              >
                {/* Glassmorphism background */}
                <div className="absolute inset-0 bg-purple-600/20 backdrop-blur-md border border-purple-500/30 rounded-lg" />
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/40 to-purple-700/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Content */}
                <div className="relative flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Explore Games
                </div>
              </Link>
              {isAuthenticated ? (
                <Link
                  to="/users"
                  className="group relative px-8 py-3 text-purple-300 rounded-lg flex items-center gap-2 text-lg font-medium overflow-hidden transition-all duration-300 hover:scale-105"
                >
                  {/* Glassmorphism background */}
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-md border border-purple-400/50 rounded-lg" />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Content */}
                  <div className="relative flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                    Browse Community
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </Link>
              ) : (
                <button
                  onClick={handleJoinCommunity}
                  className="group relative px-8 py-3 text-purple-300 rounded-lg flex items-center gap-2 text-lg font-medium overflow-hidden transition-all duration-300 hover:scale-105"
                >
                  {/* Glassmorphism background */}
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-md border border-purple-400/50 rounded-lg" />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Content */}
                  <div className="relative flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                    Join Community
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">GameVault</h2>
            <p className="text-gray-400 text-lg">The social gaming platform built for enthusiasts</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div 
              className="relative text-center p-6 bg-gray-900/80 backdrop-blur-lg rounded-lg transition-all duration-300 hover:bg-gray-900/90 group overflow-hidden cursor-pointer transform hover:scale-105 hover:shadow-2xl"
              onMouseEnter={() => setHoveredCard('ratings')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Animated gradient border */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-[-2px] bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-lg animate-pulse"></div>
                <div className="absolute inset-0 bg-gray-900/80 rounded-lg"></div>
              </div>
              
              {/* Background effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 via-purple-600/20 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-lg"></div>
              
              {/* Content */}
              <div className="relative z-10">
                <div className="transform transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2">
                  <SpinningNumber isHovered={hoveredCard === 'ratings'} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 transition-all duration-300 group-hover:text-purple-300">Precise Ratings</h3>
                <p className="text-gray-400 transition-all duration-300 group-hover:text-gray-200">
                  Rate games on a 1-10 scale. Your opinions matter.
                </p>
                
                {/* Progressive disclosure - additional details on hover */}
                <div className={`mt-4 overflow-hidden transition-all duration-500 ${hoveredCard === 'ratings' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="text-sm text-purple-300 border-t border-gray-600 pt-3">
                    Personal rating history • Compare with friends
                  </p>
                </div>
              </div>
            </div>
            
            <div 
              className="relative text-center p-6 bg-gray-900/80 backdrop-blur-lg rounded-lg transition-all duration-300 hover:bg-gray-900/90 group overflow-hidden cursor-pointer transform hover:scale-105 hover:shadow-2xl"
              onMouseEnter={() => setHoveredCard('social')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Animated gradient border */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-[-2px] bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-lg animate-pulse"></div>
                <div className="absolute inset-0 bg-gray-900/80 rounded-lg"></div>
              </div>
              
              {/* Background effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 via-blue-600/20 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-lg"></div>
              
              {/* Content */}
              <div className="relative z-10">
                <div className="transform transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2">
                  <SplittingUsers isHovered={hoveredCard === 'social'} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 transition-all duration-300 group-hover:text-blue-300">Social Discovery</h3>
                <p className="text-gray-400 transition-all duration-300 group-hover:text-gray-200">
                  Follow gamers with similar tastes. Or because they're funny.
                </p>
                
                {/* Progressive disclosure - additional details on hover */}
                <div className={`mt-4 overflow-hidden transition-all duration-500 ${hoveredCard === 'social' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="text-sm text-blue-300 border-t border-gray-600 pt-3">
                    Build connections • Find recommendations
                  </p>
                </div>
              </div>
            </div>
            
            <div 
              className="relative text-center p-6 bg-gray-900/80 backdrop-blur-lg rounded-lg transition-all duration-300 hover:bg-gray-900/90 group overflow-hidden cursor-pointer transform hover:scale-105 hover:shadow-2xl"
              onMouseEnter={() => setHoveredCard('stats')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Animated gradient border */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-[-2px] bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 rounded-lg animate-pulse"></div>
                <div className="absolute inset-0 bg-gray-900/80 rounded-lg"></div>
              </div>
              
              {/* Background effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-600/0 via-green-600/20 to-green-600/0 opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-lg"></div>
              
              {/* Content */}
              <div className="relative z-10">
                <div className="transform transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2">
                  <CascadingCheckboxes isHovered={hoveredCard === 'stats'} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 transition-all duration-300 group-hover:text-green-300">Personal Stats</h3>
                <p className="text-gray-400 transition-all duration-300 group-hover:text-gray-200">
                  Track your gaming journey. Add games to your Wishlist, Collection, and more.
                </p>
                
                {/* Progressive disclosure - additional details on hover */}
                <div className={`mt-4 overflow-hidden transition-all duration-500 ${hoveredCard === 'stats' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="text-sm text-green-300 border-t border-gray-600 pt-3">
                    Gaming insights • Progress tracking
                  </p>
                </div>
              </div>
            </div>
          </div>
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
          
          {reviewsLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-gray-700 rounded-lg overflow-hidden animate-pulse">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-600 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-600 rounded mb-3 w-3/4"></div>
                        <div className="h-3 bg-gray-600 rounded mb-4 w-1/2"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-600 rounded w-full"></div>
                          <div className="h-3 bg-gray-600 rounded w-4/5"></div>
                          <div className="h-3 bg-gray-600 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : reviewsError ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-2">Failed to load recent reviews</p>
              <p className="text-sm text-gray-500">{reviewsError}</p>
            </div>
          ) : recentReviews.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {recentReviews.map((review) => (
                <ReviewCard key={review.id} review={review} currentUserId={user?.id} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No recent reviews yet</p>
              <p className="text-sm text-gray-500 mt-2">Be the first to share your gaming experience!</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
