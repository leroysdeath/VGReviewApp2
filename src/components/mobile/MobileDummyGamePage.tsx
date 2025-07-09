import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Calendar, User, MessageCircle, Plus, Check, Heart, ScrollText, Play, Download, Share2, Bookmark, Trophy, Clock, Users as UsersIcon } from 'lucide-react';
import { StarRating } from '../StarRating';
import { MobileReviewCard } from './MobileReviewCard';
import { igdbService } from '../../services/igdbApi';

export const MobileDummyGamePage: React.FC = () => {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [coverImage, setCoverImage] = useState('https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=400');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBOTWCover = async () => {
      if (!import.meta.env.VITE_IGDB_CLIENT_ID || 
          !import.meta.env.VITE_IGDB_ACCESS_TOKEN ||
          import.meta.env.VITE_IGDB_CLIENT_ID === 'your_client_id_here') {
        console.warn('IGDB API credentials not configured, using fallback image');
        setLoading(false);
        return;
      }
      
      try {
        const games = await igdbService.searchGames('The Legend of Zelda Breath of the Wild', 1);
        if (games.length > 0 && games[0].coverImage) {
          setCoverImage(games[0].coverImage);
        }
      } catch (error) {
        console.error('Failed to fetch BOTW cover from IGDB:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBOTWCover();
  }, []);

  // Comprehensive dummy game data
  const dummyGame = {
    id: 'dummy-test-game',
    title: 'The Legend of Zelda: Breath of the Wild',
    coverImage: coverImage,
    releaseDate: '2017-03-03',
    genre: 'Action-Adventure',
    rating: 9.7,
    description: 'Step into a world of discovery, exploration, and adventure in The Legend of Zelda: Breath of the Wild. Travel across vast fields, through forests, and to mountain peaks as you discover what has become of the kingdom of Hyrule in this stunning Open-Air adventure.',
    developer: 'Nintendo EPD',
    publisher: 'Nintendo',
    platforms: ['Nintendo Switch', 'Wii U'],
    price: '$59.99',
    metacriticScore: 97,
    steamReviews: 'Universal Acclaim (Critics and Players)',
    esrbRating: 'E10+ for Everyone 10 and older',
    languages: ['English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese'],
    fileSize: '13.4 GB',
    features: [
      'Open-world exploration (100+ hours)',
      'Physics-based gameplay',
      'Weapon crafting and cooking',
      'Climbing and gliding mechanics',
      'Dynamic weather system',
      'Day/night cycle',
      'Shrine puzzles (120 shrines)',
      'Divine Beast dungeons',
      'Amiibo support',
      'Master Mode (Hard difficulty)',
      'DLC expansion content',
      'Portable and docked play'
    ],
    screenshots: [
      'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/3945656/pexels-photo-3945656.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/3945670/pexels-photo-3945670.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/3945672/pexels-photo-3945672.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
  };

  // Comprehensive dummy reviews
  const dummyReviews = [
    {
      id: 'review-1',
      userId: '1',
      gameId: 'dummy-test-game',
      rating: 9.5,
      text: 'Absolutely phenomenal! The open world is breathtaking and the freedom of exploration is unmatched. The physics engine creates endless possibilities for creative problem-solving.',
      date: '2024-01-20',
      hasText: true,
      author: 'ZeldaFan92',
      authorAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    {
      id: 'review-2',
      userId: '2',
      gameId: 'dummy-test-game',
      rating: 8.5,
      text: 'Great game with stunning visuals and innovative gameplay mechanics. The cooking and weapon systems add depth to the survival elements.',
      date: '2024-01-18',
      hasText: true,
      author: 'AdventureSeeker',
      authorAvatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    {
      id: 'review-3',
      userId: '3',
      gameId: 'dummy-test-game',
      rating: 9.0,
      text: 'The attention to detail is remarkable. Every corner of Hyrule tells a story, and the environmental storytelling is masterful.',
      date: '2024-01-15',
      hasText: true,
      author: 'HyruleExplorer',
      authorAvatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150'
    }
  ];

  const averageRating = dummyReviews.length > 0 
    ? dummyReviews.reduce((sum, review) => sum + review.rating, 0) / dummyReviews.length 
    : 0;

  const ratingDistribution = [
    { rating: 10, count: 42 },
    { rating: 9, count: 38 },
    { rating: 8, count: 15 },
    { rating: 7, count: 3 },
    { rating: 6, count: 1 },
    { rating: 5, count: 1 },
  ];

  const maxCount = Math.max(...ratingDistribution.map(d => d.count));

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="px-4 py-6">
        {/* Dummy Test Banner */}
        <div className="bg-green-600 text-white p-3 rounded-lg mb-4 text-center">
          <h2 className="text-sm font-semibold">🎮 Dummy Test Game Page - Mobile</h2>
          <p className="text-xs opacity-90">Comprehensive mobile game page showcase</p>
        </div>

        {/* Game Header */}
        <div className="bg-gray-800 rounded-lg overflow-hidden mb-6">
          <div className="relative">
            {loading ? (
              <div className="h-64 w-full bg-gray-700 animate-pulse flex items-center justify-center">
                <span className="text-gray-400 text-sm">Loading cover...</span>
              </div>
            ) : (
              <img
                src={dummyGame.coverImage}
                alt={dummyGame.title}
                className="w-full h-64 object-cover"
              />
            )}
            {/* Rating overlay */}
            <div className="absolute bottom-4 right-4 bg-gray-500 px-3 py-1 rounded">
              <span className="text-white font-bold">{averageRating.toFixed(1)}</span>
            </div>
          </div>
          
          <div className="p-4">
            <h1 className="text-xl font-bold text-white mb-3">{dummyGame.title}</h1>
            <div className="space-y-2 text-gray-400 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{dummyGame.releaseDate}</span>
              </div>
              <div><strong>Developer:</strong> {dummyGame.developer}</div>
              <div><strong>Publisher:</strong> {dummyGame.publisher}</div>
              <div><strong>Genre:</strong> {dummyGame.genre}</div>
              <div><strong>Platforms:</strong> {dummyGame.platforms.join(', ')}</div>
              <div><strong>Price:</strong> <span className="text-green-400">{dummyGame.price}</span></div>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed text-sm">{dummyGame.description}</p>
            
            {/* Action Buttons */}
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                  <Play className="h-4 w-4" />
                  Play Now
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm">
                  <Bookmark className="h-4 w-4" />
                  Save
                </button>
              </div>
            </div>
            
            {/* User Actions */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsInWishlist(!isInWishlist)}
                    className={`relative w-6 h-6 border-2 border-gray-400 rounded transition-all duration-200 flex items-center justify-center overflow-visible ${
                      isInWishlist 
                        ? 'bg-gray-800 border-gray-300' 
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {isInWishlist && (
                      <Check className="h-7 w-7 text-green-500 stroke-[3] absolute -top-0.5 -left-0.5" />
                    )}
                  </button>
                  <span className="text-gray-300 text-sm">Started Game</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsCompleted(!isCompleted)}
                    className={`relative w-6 h-6 border-2 border-gray-400 rounded transition-all duration-200 flex items-center justify-center overflow-visible ${
                      isCompleted 
                        ? 'bg-gray-800 border-gray-300' 
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {isCompleted && (
                      <Check className="h-7 w-7 text-green-500 stroke-[3] absolute -top-0.5 -left-0.5" />
                    )}
                  </button>
                  <span className="text-gray-300 text-sm">Finished Game</span>
                </div>
              </div>
              
              <Link
                to={`/review/${dummyGame.id}`}
                className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <ScrollText className="h-4 w-4" />
                Write a Review
              </Link>
            </div>
          </div>
        </div>

        {/* Screenshots */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Screenshots</h3>
          <div className="grid grid-cols-2 gap-3">
            {dummyGame.screenshots.map((screenshot, index) => (
              <img
                key={index}
                src={screenshot}
                alt={`Screenshot ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg hover:scale-105 transition-transform cursor-pointer"
              />
            ))}
          </div>
        </div>

        {/* Community Rating */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Community Rating</h3>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {averageRating.toFixed(1)}
            </div>
            <StarRating rating={averageRating} size="lg" />
            <div className="text-gray-400 mt-2 text-sm">{dummyReviews.length} reviews</div>
          </div>
          
          {/* Rating Distribution */}
          <div className="space-y-2">
            {ratingDistribution.map((item) => (
              <div key={item.rating} className="flex items-center gap-2">
                <span className="text-gray-400 w-6 text-sm">{item.rating}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  ></div>
                </div>
                <span className="text-gray-400 text-sm w-8">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Game Features */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Features</h3>
          <div className="space-y-2">
            {dummyGame.features.slice(0, 6).map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                <span className="text-gray-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
          <button className="mt-3 text-purple-400 text-sm hover:text-purple-300 transition-colors">
            Show all features
          </button>
        </div>

        {/* Game Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Game Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Metacritic Score:</span>
              <span className="text-green-400 font-semibold">{dummyGame.metacriticScore}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">ESRB Rating:</span>
              <span className="text-gray-400">{dummyGame.esrbRating}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">File Size:</span>
              <span className="text-gray-400">{dummyGame.fileSize}</span>
            </div>
            <div>
              <span className="text-gray-300">Languages:</span>
              <div className="text-gray-400 mt-1 text-xs">
                {dummyGame.languages.join(', ')}
              </div>
            </div>
          </div>
        </div>

        {/* Community Stats */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Community</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="text-white font-semibold">47</div>
              <div className="text-gray-400 text-xs">Achievements</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <UsersIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="text-white font-semibold">2.3M</div>
              <div className="text-gray-400 text-xs">Players</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-green-400" />
              </div>
              <div className="text-white font-semibold">67h</div>
              <div className="text-gray-400 text-xs">Avg. Playtime</div>
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Recent Reviews</h2>
          <div className="space-y-4">
            {dummyReviews.map((review) => (
              <MobileReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};