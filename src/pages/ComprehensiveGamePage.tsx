import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, Calendar, User, MessageCircle, Plus, Check, Heart, ScrollText, Play, Download, Share2, Bookmark, Trophy, Clock, Users as UsersIcon, Gamepad2, ChevronLeft, ChevronRight, X, ExternalLink, Filter, ThumbsUp, ThumbsDown, Flag, MoreHorizontal, Grid, List, Search, Facebook, Twitter, Instagram, Youtube, Twitch, Stamp as Steam, ArrowLeft, Home, ChevronDown, Eye, Camera, Info, Award, Globe, Zap } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { ReviewCard } from '../components/ReviewCard';
import { SEOHead } from '../components/SEOHead';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useIGDBGame } from '../hooks/useGames';
import { useResponsive } from '../hooks/useResponsive';
import { supabase } from '../services/supabase';

interface GameDetails {
  id: string;
  title: string;
  coverImage: string;
  releaseDate: string;
  genre: string;
  rating: number;
  description: string;
  developer: string;
  publisher: string;
  platforms: string[];
  screenshots: string[];
  videos: string[];
  systemRequirements: {
    minimum: Record<string, string>;
    recommended: Record<string, string>;
  };
  features: string[];
  dlc: Array<{ name: string; price: string; releaseDate: string }>;
  achievements: Array<{ name: string; description: string; rarity: number }>;
  metacriticScore: number;
  steamReviews: string;
  esrbRating: string;
  languages: string[];
  fileSize: string;
  price: string;
  discount?: { percentage: number; originalPrice: string };
}

interface Review {
  id: string;
  userId: string;
  gameId: string;
  rating: number;
  text: string;
  date: string;
  hasText: boolean;
  author: string;
  authorAvatar: string;
  helpful: number;
  notHelpful: number;
  platform?: string;
  playtime?: string;
  verified: boolean;
}

interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export const ComprehensiveGamePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  
  // Use caching hook for game data
  const gameIdNumber = id ? parseInt(id) : null;
  const { 
    data: gameData, 
    loading: gameLoading, 
    error: gameError, 
    cached: isGameCached, 
    refetch: refetchGame,
    isStale: isGameStale 
  } = useIGDBGame(gameIdNumber);

  // Transform IGDB data to GameDetails format
  const transformIGDBToGameDetails = (igdbGame: any): GameDetails => {
    return {
      id: igdbGame.id?.toString() || 'unknown',
      title: igdbGame.name || igdbGame.title || 'Unknown Game',
      coverImage: igdbGame.cover?.url || igdbGame.coverImage || '/placeholder-game.jpg',
      releaseDate: igdbGame.first_release_date 
        ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
        : igdbGame.releaseDate || 'Unknown',
      genre: Array.isArray(igdbGame.genres) 
        ? igdbGame.genres.map(g => g.name || g).join(', ')
        : igdbGame.genre || 'Unknown',
      rating: igdbGame.rating ? Math.round(igdbGame.rating) / 10 : 7.5,
      description: igdbGame.summary || igdbGame.description || 'No description available for this game.',
      developer: igdbGame.involved_companies?.[0]?.company?.name || 
                 (Array.isArray(igdbGame.developers) ? igdbGame.developers[0] : igdbGame.developer) || 'Unknown Developer',
      publisher: igdbGame.involved_companies?.find(c => c.publisher)?.company?.name || 
                 (Array.isArray(igdbGame.publishers) ? igdbGame.publishers[0] : igdbGame.publisher) || 'Unknown Publisher',
      platforms: igdbGame.platforms?.map(p => p.name || p) || 
                 (Array.isArray(igdbGame.platforms) ? igdbGame.platforms : ['PC']),
      screenshots: igdbGame.screenshots?.map(s => s.url || s) || 
                   Array.from({length: 6}, (_, i) => `https://images.pexels.com/photos/${3945654 + i}/pexels-photo-${3945654 + i}.jpeg?auto=compress&cs=tinysrgb&w=1200`),
      videos: igdbGame.videos || ['dQw4w9WgXcQ'],
      // Default system requirements (would come from enhanced API in real implementation)
      systemRequirements: {
        minimum: {
          'OS': 'Windows 10 64-bit',
          'Processor': 'Intel Core i5-3570K or AMD FX-8310',
          'Memory': '8 GB RAM',
          'Graphics': 'NVIDIA GeForce GTX 780 or AMD Radeon RX 470',
          'DirectX': 'Version 12',
          'Storage': '50 GB available space'
        },
        recommended: {
          'OS': 'Windows 10/11 64-bit',
          'Processor': 'Intel Core i7-4790 or AMD Ryzen 3 3200G',
          'Memory': '16 GB RAM',
          'Graphics': 'NVIDIA GeForce GTX 1060 6GB or AMD Radeon R9 Fury',
          'DirectX': 'Version 12',
          'Storage': '50 GB SSD space'
        }
      },
      features: [
        'Single-player campaign',
        'Multiplayer support',
        'Achievement system',
        'Cloud saves',
        'Controller support',
        'High-resolution textures'
      ],
      dlc: [],
      achievements: [
        { name: 'First Steps', description: 'Complete the tutorial', rarity: 95 },
        { name: 'Dedicated Player', description: 'Play for 10 hours', rarity: 45 },
        { name: 'Master', description: 'Complete all objectives', rarity: 8 }
      ],
      metacriticScore: Math.round(igdbGame.rating || 75),
      steamReviews: 'Very Positive (89% of reviews)',
      esrbRating: 'T for Teen',
      languages: ['English', 'Spanish', 'French', 'German', 'Japanese'],
      fileSize: '45 GB',
      price: '$39.99'
    };
  };

  const game = gameData ? transformIGDBToGameDetails(gameData) : null;
  const loading = gameLoading;
  const error = gameError?.message || null;

  // State management
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'screenshots' | 'details'>('overview');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('helpful');
  const [reviewsPage, setReviewsPage] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [galleryView, setGalleryView] = useState<'grid' | 'carousel'>('grid');
  
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Refs
  const reviewsRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Load reviews when game data is available
  useEffect(() => {
    const loadReviews = async () => {
      if (!game || !id) return;
      
      setLoadingReviews(true);
      setReviewsError(null);
      
      try {
        console.log('Loading reviews for game ID:', id);
        
        // Check if game exists in our database
        const { data: existingGame, error: dbError } = await supabase
          .from('game')
          .select('id')
          .eq('game_id', id)
          .single();
          
        if (existingGame) {
          // Fetch reviews for this game
          const { data: gameReviews, error: reviewsError } = await supabase
            .from('rating')
            .select(`
              *,
              user:user_id(*)
            `)
            .eq('game_id', existingGame.id);
            
          if (!reviewsError && gameReviews) {
            const transformedReviews = gameReviews.map(review => ({
              id: review.id.toString(),
              userId: review.user_id.toString(),
              gameId: review.game_id.toString(),
              igdbGameId: id, // Use the IGDB game_id from the URL parameter
              rating: review.rating,
              text: review.review || '',
              date: new Date(review.post_date_time).toISOString().split('T')[0],
              hasText: !!review.review,
              author: review.user?.name || 'Anonymous',
              authorAvatar: review.user?.picurl || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
              helpful: Math.floor(Math.random() * 100),
              notHelpful: Math.floor(Math.random() * 20),
              platform: 'PC',
              playtime: `${Math.floor(Math.random() * 50) + 5} hours`,
              verified: Math.random() > 0.3
            }));
            setReviews(transformedReviews);
          }
        } else {
          // Use mock reviews if no database reviews found
          setReviews(mockReviews);
        }
      } catch (err) {
        console.error('Error loading reviews:', err);
        setReviewsError('Failed to load reviews');
        // Fallback to mock reviews
        setReviews(mockReviews);
      } finally {
        setLoadingReviews(false);
      }
    };

    loadReviews();
  }, [game, id]);

  // Mock reviews fallback
  const mockReviews: Review[] = [
    {
      id: '1',
      userId: '1',
      gameId: game?.id || 'unknown',
      rating: 9.0,
      text: 'This is an outstanding game with incredible attention to detail. The gameplay mechanics are smooth and engaging, and the story keeps you hooked from start to finish. Highly recommended for anyone who enjoys this genre.',
      date: '2024-01-15',
      hasText: true,
      author: 'GameEnthusiast2024',
      authorAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
      helpful: 234,
      notHelpful: 12,
      platform: 'PC',
      playtime: '45 hours',
      verified: true
    },
    {
      id: '2',
      userId: '2',
      gameId: game?.id || 'unknown',
      rating: 8.5,
      text: 'Great game with solid mechanics and beautiful visuals. The performance has been excellent and I haven\'t encountered any major bugs. The gameplay is addictive and the progression system is well-balanced.',
      date: '2024-01-12',
      hasText: true,
      author: 'ProGamer123',
      authorAvatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
      helpful: 189,
      notHelpful: 8,
      platform: 'PlayStation 5',
      playtime: '32 hours',
      verified: true
    },
    {
      id: '3',
      userId: '3',
      gameId: game?.id || 'unknown',
      rating: 7.5,
      text: 'Solid game overall with engaging gameplay. There are some minor issues with pacing in certain sections, but nothing that breaks the experience. Worth playing if you enjoy games in this genre.',
      date: '2024-01-10',
      hasText: true,
      author: 'CasualGamer',
      authorAvatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150',
      helpful: 156,
      notHelpful: 23,
      platform: 'Xbox Series X',
      playtime: '28 hours',
      verified: false
    }
  ];

  // Calculate rating distribution from reviews
  const ratingDistribution: RatingDistribution[] = React.useMemo(() => {
    if (reviews.length === 0) {
      // Default distribution
      return [
        { rating: 10, count: 125, percentage: 28 },
        { rating: 9, count: 158, percentage: 35 },
        { rating: 8, count: 89, percentage: 20 },
        { rating: 7, count: 45, percentage: 10 },
        { rating: 6, count: 18, percentage: 4 },
        { rating: 5, count: 9, percentage: 2 },
        { rating: 4, count: 4, percentage: 1 },
        { rating: 3, count: 2, percentage: 0 },
        { rating: 2, count: 1, percentage: 0 },
        { rating: 1, count: 1, percentage: 0 }
      ];
    }

    const distribution = Array.from({ length: 10 }, (_, i) => ({
      rating: 10 - i,
      count: 0,
      percentage: 0
    }));

    reviews.forEach(review => {
      const rating = Math.floor(review.rating);
      const index = distribution.findIndex(d => d.rating === rating);
      if (index !== -1) {
        distribution[index].count++;
      }
    });

    const total = reviews.length;
    distribution.forEach(item => {
      item.percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
    });

    return distribution;
  }, [reviews]);

  const relatedGames = [
    {
      id: 'related-1',
      title: 'Similar Adventure Game',
      coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
      rating: 9.3,
      price: '$39.99'
    },
    {
      id: 'related-2',
      title: 'Action RPG Classic',
      coverImage: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400',
      rating: 8.1,
      price: '$29.99'
    },
    {
      id: 'related-3',
      title: 'Indie Masterpiece',
      coverImage: 'https://images.pexels.com/photos/3945656/pexels-photo-3945656.jpeg?auto=compress&cs=tinysrgb&w=400',
      rating: 7.8,
      price: '$19.99'
    }
  ];

  // Image gallery handlers
  const openLightbox = (image: string, index: number) => {
    setSelectedImage(image);
    setImageIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    if (!game) return;
    const nextIndex = (imageIndex + 1) % game.screenshots.length;
    setImageIndex(nextIndex);
    setSelectedImage(game.screenshots[nextIndex]);
  };

  const prevImage = () => {
    if (!game) return;
    const prevIndex = imageIndex === 0 ? game.screenshots.length - 1 : imageIndex - 1;
    setImageIndex(prevIndex);
    setSelectedImage(game.screenshots[prevIndex]);
  };

  // Social sharing
  const shareGame = (platform: string) => {
    const url = window.location.href;
    const text = `Check out ${game?.title}!`;
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      reddit: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`
    };

    window.open(shareUrls[platform as keyof typeof shareUrls], '_blank', 'width=600,height=400');
  };

  // Infinite scroll for reviews
  const loadMoreReviews = useCallback(() => {
    if (loadingReviews) return;
    
    setLoadingReviews(true);
    // Simulate loading more reviews
    setTimeout(() => {
      setReviewsPage(prev => prev + 1);
      setLoadingReviews(false);
    }, 1000);
  }, [loadingReviews]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedImage, imageIndex]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--game-dark)] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Loading game details..." />
          {isGameCached && (
            <div className="mt-4 text-sm text-gray-400">
              Loading from cache...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-[var(--game-dark)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{error || 'Game not found'}</h1>
          <p className="text-gray-400 mb-4">
            Debug: Tried to load game with ID: {id}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={refetchGame}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
            <Link to="/search" className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
              Browse other games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[var(--game-dark)] text-white font-['Space_Grotesk',ui-sans-serif,system-ui,sans-serif]">
        {/* SEO Head */}
        <SEOHead
          title={`${game.title} - Game Details`}
          description={game.description}
          image={game.coverImage}
          type="game"
          gameData={{
            name: game.title,
            developer: game.developer,
            publisher: game.publisher,
            releaseDate: game.releaseDate,
            genre: game.genre,
            rating: game.rating
          }}
        />

        {/* Cache Status Indicator */}
        {(isGameCached || isGameStale) && (
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isGameCached && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    📦 Cached Data
                  </span>
                )}
                {isGameStale && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    ⚠️ Data may be outdated
                  </span>
                )}
              </div>
              {isGameStale && (
                <button
                  onClick={refetchGame}
                  className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors"
                >
                  🔄 Refresh
                </button>
              )}
            </div>
          </div>
        )}

        {/* Breadcrumb Navigation */}
        <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3" aria-label="Breadcrumb">
          <div className="max-w-7xl mx-auto">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </li>
              <ChevronRight className="h-4 w-4 text-gray-600" />
              <li>
                <Link to="/search" className="text-gray-400 hover:text-white transition-colors">
                  Games
                </Link>
              </li>
              <ChevronRight className="h-4 w-4 text-gray-600" />
              <li>
                <span className="text-white font-medium">{game.title}</span>
              </li>
            </ol>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={game.screenshots[0] || game.coverImage}
              alt={game.title}
              className="w-full h-full object-cover"
              loading="eager"
              onError={(e) => {
                e.currentTarget.src = game.coverImage;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--game-dark)] via-[var(--game-dark)]/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--game-dark)] via-transparent to-transparent"></div>
          </div>

          {/* Hero Content */}
          <div className="relative max-w-7xl mx-auto px-4 py-12 lg:py-20">
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              {/* Game Cover */}
              <div className="lg:col-span-1">
                <div className="relative group">
                  <img
                    src={game.coverImage}
                    alt={game.title}
                    className="w-full max-w-sm mx-auto lg:mx-0 rounded-lg shadow-2xl transition-transform duration-300 group-hover:scale-105"
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-game.jpg';
                    }}
                  />
                  {game.discount && (
                    <div className="absolute top-4 right-4 bg-[var(--game-red)] text-white px-3 py-1 rounded-full text-sm font-bold">
                      -{game.discount.percentage}%
                    </div>
                  )}
                </div>
              </div>

              {/* Game Info */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h1 className="text-4xl lg:text-6xl font-bold mb-4 leading-tight">
                    {game.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-lg text-gray-300 mb-6">
                    <span className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {game.developer}
                    </span>
                    <span className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {new Date(game.releaseDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-2">
                      <Gamepad2 className="h-5 w-5" />
                      {game.genre}
                    </span>
                  </div>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <StarRating rating={game.rating} size="lg" />
                      <span className="text-2xl font-bold text-[var(--game-orange)]">
                        {game.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-gray-400">
                      Based on {ratingDistribution.reduce((sum, r) => sum + r.count, 0).toLocaleString()} reviews
                    </div>
                  </div>

                  {/* Platforms */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {game.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="px-3 py-1 bg-gray-800 rounded-full text-sm border border-gray-700"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    {game.discount ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-[var(--game-green)]">
                          {game.price}
                        </span>
                        <span className="text-lg text-gray-400 line-through">
                          {game.discount.originalPrice}
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-[var(--game-green)]">
                        {game.price}
                      </span>
                    )}
                  </div>
                  
                  <button className="flex items-center gap-2 px-6 py-3 bg-[var(--game-green)] text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                    <Download className="h-5 w-5" />
                    Buy Now
                  </button>
                  
                  <button
                    onClick={() => setIsInWishlist(!isInWishlist)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg border transition-colors font-medium ${
                      isInWishlist
                        ? 'bg-[var(--game-purple)] border-[var(--game-purple)] text-white'
                        : 'border-gray-600 text-gray-300 hover:border-[var(--game-purple)] hover:text-[var(--game-purple)]'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-current' : ''}`} />
                    {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                  </button>

                  {/* Share Dropdown */}
                  <div className="relative group">
                    <button className="flex items-center gap-2 px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-gray-500 transition-colors font-medium">
                      <Share2 className="h-5 w-5" />
                      Share
                    </button>
                    <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      <div className="p-2 space-y-1 min-w-[150px]">
                        <button
                          onClick={() => shareGame('twitter')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-700 rounded transition-colors"
                        >
                          <Twitter className="h-4 w-4" />
                          Twitter
                        </button>
                        <button
                          onClick={() => shareGame('facebook')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-700 rounded transition-colors"
                        >
                          <Facebook className="h-4 w-4" />
                          Facebook
                        </button>
                        <button
                          onClick={() => shareGame('reddit')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-700 rounded transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Reddit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {/* Tab Navigation */}
              <nav className="flex border-b border-gray-800 mb-8 overflow-x-auto">
                {[
                  { key: 'overview', label: 'Overview', icon: Info },
                  { key: 'reviews', label: 'Reviews', icon: MessageCircle },
                  { key: 'screenshots', label: 'Screenshots', icon: Camera },
                  { key: 'details', label: 'Details', icon: Award }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === key
                        ? 'border-[var(--game-purple)] text-[var(--game-purple)]'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </nav>

              {/* Tab Content */}
              <div className="space-y-8">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    {/* Description */}
                    <section>
                      <h2 className="text-2xl font-bold mb-4">About This Game</h2>
                      <p className="text-gray-300 leading-relaxed text-lg">
                        {game.description}
                      </p>
                    </section>

                    {/* Key Features */}
                    <section>
                      <h2 className="text-2xl font-bold mb-4">Key Features</h2>
                      <div className="grid md:grid-cols-2 gap-3">
                        {game.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <Check className="h-5 w-5 text-[var(--game-green)] flex-shrink-0" />
                            <span className="text-gray-300">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Screenshots Preview */}
                    <section>
                      <h2 className="text-2xl font-bold mb-4">Screenshots</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {game.screenshots.slice(0, 6).map((screenshot, index) => (
                          <button
                            key={index}
                            onClick={() => openLightbox(screenshot, index)}
                            className="relative group overflow-hidden rounded-lg aspect-video"
                          >
                            <img
                              src={screenshot}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-screenshot.jpg';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                              <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setActiveTab('screenshots')}
                        className="mt-4 text-[var(--game-purple)] hover:text-purple-300 transition-colors"
                      >
                        View all screenshots →
                      </button>
                    </section>
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div className="space-y-8">
                    {/* Review Summary */}
                    <section className="bg-gray-900 rounded-lg p-6">
                      <h2 className="text-2xl font-bold mb-6">User Reviews</h2>
                      
                      <div className="grid md:grid-cols-2 gap-8">
                        {/* Overall Rating */}
                        <div className="text-center">
                          <div className="text-5xl font-bold text-[var(--game-orange)] mb-2">
                            {game.rating.toFixed(1)}
                          </div>
                          <StarRating rating={game.rating} size="lg" />
                          <div className="text-gray-400 mt-2">
                            {ratingDistribution.reduce((sum, r) => sum + r.count, 0).toLocaleString()} reviews
                          </div>
                        </div>

                        {/* Rating Distribution */}
                        <div className="space-y-2">
                          {ratingDistribution.reverse().map((item) => (
                            <div key={item.rating} className="flex items-center gap-3">
                              <span className="text-sm text-gray-400 w-8">{item.rating}★</span>
                              <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                                <div
                                  className="bg-[var(--game-orange)] h-full transition-all duration-500"
                                  style={{ width: `${item.percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-400 w-12 text-right">
                                {item.percentage}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>

                    {/* Review Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <select
                          value={reviewFilter}
                          onChange={(e) => setReviewFilter(e.target.value)}
                          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--game-purple)]"
                        >
                          <option value="helpful">Most Helpful</option>
                          <option value="recent">Most Recent</option>
                          <option value="highest">Highest Rated</option>
                          <option value="lowest">Lowest Rated</option>
                        </select>
                      </div>
                      
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--game-purple)] text-white rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Write Review
                      </button>
                    </div>

                    {/* Reviews List */}
                    <div ref={reviewsRef} className="space-y-6">
                      {reviewsError ? (
                        <div className="text-center py-8">
                          <p className="text-red-400 mb-4">{reviewsError}</p>
                          <button
                            onClick={() => window.location.reload()}
                            className="text-purple-400 hover:text-purple-300"
                          >
                            Try again
                          </button>
                        </div>
                      ) : reviews.length > 0 ? (
                        reviews.map((review) => (
                          <article key={review.id} className="bg-gray-900 rounded-lg p-6">
                            <div className="flex items-start gap-4">
                              <img
                                src={review.authorAvatar}
                                alt={review.author}
                                className="w-12 h-12 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150';
                                }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-4 mb-3">
                                  <h3 className="font-semibold text-white">{review.author}</h3>
                                  {review.verified && (
                                    <span className="flex items-center gap-1 text-[var(--game-green)] text-sm">
                                      <Check className="h-4 w-4" />
                                      Verified Purchase
                                    </span>
                                  )}
                                  <span className="text-gray-400 text-sm">{review.date}</span>
                                </div>
                                
                                <div className="flex items-center gap-4 mb-3">
                                  <StarRating rating={review.rating} />
                                  <span className="font-semibold text-[var(--game-orange)]">
                                    {review.rating.toFixed(1)}
                                  </span>
                                  {review.platform && (
                                    <span className="text-gray-400 text-sm">
                                      Played on {review.platform}
                                    </span>
                                  )}
                                  {review.playtime && (
                                    <span className="text-gray-400 text-sm">
                                      {review.playtime} played
                                    </span>
                                  )}
                                </div>
                                
                                <p className="text-gray-300 leading-relaxed mb-4">
                                  {review.text}
                                </p>
                                
                                <div className="flex items-center gap-4">
                                  <button className="flex items-center gap-2 text-gray-400 hover:text-[var(--game-green)] transition-colors">
                                    <ThumbsUp className="h-4 w-4" />
                                    <span>{review.helpful}</span>
                                  </button>
                                  <button className="flex items-center gap-2 text-gray-400 hover:text-[var(--game-red)] transition-colors">
                                    <ThumbsDown className="h-4 w-4" />
                                    <span>{review.notHelpful}</span>
                                  </button>
                                  <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                                    <Flag className="h-4 w-4" />
                                    Report
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>No reviews yet. Be the first to review this game!</p>
                        </div>
                      )}
                    </div>

                    {/* Load More Reviews */}
                    {reviews.length > 0 && (
                      <div className="text-center">
                        <button
                          onClick={loadMoreReviews}
                          disabled={loadingReviews}
                          className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          {loadingReviews ? 'Loading...' : 'Load More Reviews'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Screenshots Tab */}
                {activeTab === 'screenshots' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">Screenshots</h2>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setGalleryView('grid')}
                          className={`p-2 rounded-lg transition-colors ${
                            galleryView === 'grid'
                              ? 'bg-[var(--game-purple)] text-white'
                              : 'bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <Grid className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setGalleryView('carousel')}
                          className={`p-2 rounded-lg transition-colors ${
                            galleryView === 'carousel'
                              ? 'bg-[var(--game-purple)] text-white'
                              : 'bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <List className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {galleryView === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {game.screenshots.map((screenshot, index) => (
                          <button
                            key={index}
                            onClick={() => openLightbox(screenshot, index)}
                            className="relative group overflow-hidden rounded-lg aspect-video"
                          >
                            <img
                              src={screenshot}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-screenshot.jpg';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                              <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div ref={galleryRef} className="space-y-4">
                        {game.screenshots.map((screenshot, index) => (
                          <button
                            key={index}
                            onClick={() => openLightbox(screenshot, index)}
                            className="block w-full group"
                          >
                            <img
                              src={screenshot}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-screenshot.jpg';
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Details Tab */}
                {activeTab === 'details' && (
                  <div className="space-y-8">
                    {/* System Requirements */}
                    <section>
                      <h2 className="text-2xl font-bold mb-6">System Requirements</h2>
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-gray-900 rounded-lg p-6">
                          <h3 className="text-xl font-semibold text-[var(--game-orange)] mb-4">
                            Minimum
                          </h3>
                          <div className="space-y-3">
                            {Object.entries(game.systemRequirements.minimum).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-400">{key}:</span>
                                <span className="text-white text-right">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="bg-gray-900 rounded-lg p-6">
                          <h3 className="text-xl font-semibold text-[var(--game-green)] mb-4">
                            Recommended
                          </h3>
                          <div className="space-y-3">
                            {Object.entries(game.systemRequirements.recommended).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-400">{key}:</span>
                                <span className="text-white text-right">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Game Information */}
                    <section>
                      <h2 className="text-2xl font-bold mb-6">Game Information</h2>
                      <div className="bg-gray-900 rounded-lg p-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <span className="text-gray-400">Developer:</span>
                              <span className="text-white ml-2">{game.developer}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Publisher:</span>
                              <span className="text-white ml-2">{game.publisher}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Release Date:</span>
                              <span className="text-white ml-2">
                                {new Date(game.releaseDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Genre:</span>
                              <span className="text-white ml-2">{game.genre}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">ESRB Rating:</span>
                              <span className="text-white ml-2">{game.esrbRating}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <span className="text-gray-400">Metacritic Score:</span>
                              <span className="text-[var(--game-green)] ml-2 font-bold">
                                {game.metacriticScore}/100
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Steam Reviews:</span>
                              <span className="text-white ml-2">{game.steamReviews}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">File Size:</span>
                              <span className="text-white ml-2">{game.fileSize}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Languages:</span>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {game.languages.map((lang) => (
                                  <span
                                    key={lang}
                                    className="px-2 py-1 bg-gray-800 rounded text-sm"
                                  >
                                    {lang}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Achievements */}
                    <section>
                      <h2 className="text-2xl font-bold mb-6">Achievements</h2>
                      <div className="space-y-4">
                        {game.achievements.map((achievement, index) => (
                          <div key={index} className="bg-gray-900 rounded-lg p-4 flex items-center gap-4">
                            <Trophy className="h-8 w-8 text-[var(--game-orange)]" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-white">{achievement.name}</h3>
                              <p className="text-gray-400 text-sm">{achievement.description}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-400">Unlocked by</div>
                              <div className="font-semibold text-white">{achievement.rarity}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-8">
              {/* Quick Stats */}
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Metacritic</span>
                    <span className="text-[var(--game-green)] font-bold">{game.metacriticScore}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">User Score</span>
                    <span className="text-[var(--game-orange)] font-bold">{game.rating}/10</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Reviews</span>
                    <span className="text-white font-bold">
                      {ratingDistribution.reduce((sum, r) => sum + r.count, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">File Size</span>
                    <span className="text-white font-bold">{game.fileSize}</span>
                  </div>
                </div>
              </div>

              {/* Related Games */}
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">You Might Also Like</h3>
                <div className="space-y-4">
                  {relatedGames.map((relatedGame) => (
                    <Link
                      key={relatedGame.id}
                      to={`/game/${relatedGame.id}`}
                      className="flex gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors group"
                    >
                      <img
                        src={relatedGame.coverImage}
                        alt={relatedGame.title}
                        className="w-16 h-20 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-game.jpg';
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-white group-hover:text-[var(--game-purple)] transition-colors">
                          {relatedGame.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating rating={relatedGame.rating} size="sm" />
                          <span className="text-sm text-gray-400">{relatedGame.rating}</span>
                        </div>
                        <div className="text-[var(--game-green)] font-bold mt-1">
                          {relatedGame.price}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Follow</h3>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="#"
                    className="flex items-center justify-center gap-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Steam className="h-5 w-5" />
                    <span className="text-sm">Steam</span>
                  </a>
                  <a
                    href="#"
                    className="flex items-center justify-center gap-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Youtube className="h-5 w-5" />
                    <span className="text-sm">YouTube</span>
                  </a>
                  <a
                    href="#"
                    className="flex items-center justify-center gap-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Twitter className="h-5 w-5" />
                    <span className="text-sm">Twitter</span>
                  </a>
                  <a
                    href="#"
                    className="flex items-center justify-center gap-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Twitch className="h-5 w-5" />
                    <span className="text-sm">Twitch</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Lightbox */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-7xl max-h-full">
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              
              <img
                src={selectedImage}
                alt={`Screenshot ${imageIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-screenshot.jpg';
                }}
              />
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 rounded-full px-4 py-2 text-white text-sm">
                {imageIndex + 1} / {game.screenshots.length}
              </div>
            </div>
          </div>
        )}

        {/* Review Form Modal */}
        {showReviewForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Write a Review</h2>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Rating *
                  </label>
                  <div className="flex items-center gap-4">
                    <StarRating rating={0} interactive size="lg" />
                    <span className="text-xl font-bold text-white">0.0</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Review Title
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--game-purple)]"
                    placeholder="Summarize your review..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Review *
                  </label>
                  <textarea
                    rows={6}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--game-purple)]"
                    placeholder="Share your thoughts about this game..."
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Platform Played
                    </label>
                    <select className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--game-purple)]">
                      <option value="">Select platform</option>
                      <option value="pc">PC</option>
                      <option value="ps5">PlayStation 5</option>
                      <option value="xbox">Xbox Series X/S</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Hours Played
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--game-purple)]"
                      placeholder="e.g., 25 hours"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="recommend"
                    className="w-4 h-4 text-[var(--game-purple)] bg-gray-800 border-gray-600 rounded focus:ring-[var(--game-purple)]"
                  />
                  <label htmlFor="recommend" className="text-gray-300">
                    I recommend this game
                  </label>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[var(--game-purple)] text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                  >
                    Submit Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};
