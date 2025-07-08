import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Calendar, User, MessageCircle, Plus, Check, Heart, ScrollText, Play, Download, Share2, Bookmark, Trophy, Clock, Users as UsersIcon } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { ReviewCard } from '../components/ReviewCard';
import { igdbService } from '../services/igdbApi';

export const DummyGamePage: React.FC = () => {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [coverImage, setCoverImage] = useState('https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=400');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBOTWCover = async () => {
      // Skip API call if credentials are not properly configured
      if (!import.meta.env.VITE_IGDB_CLIENT_ID || 
          !import.meta.env.VITE_IGDB_ACCESS_TOKEN ||
          import.meta.env.VITE_IGDB_CLIENT_ID === 'your_client_id_here') {
        console.warn('IGDB API credentials not configured, using fallback image');
        setLoading(false);
        return;
      }
      
      try {
        // Search for Breath of the Wild specifically
        const games = await igdbService.searchGames('The Legend of Zelda Breath of the Wild', 1);
        if (games.length > 0 && games[0].coverImage) {
          setCoverImage(games[0].coverImage);
        }
      } catch (error) {
        console.error('Failed to fetch BOTW cover from IGDB:', error);
        // Keep the fallback image if API fails
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
    description: 'Step into a world of discovery, exploration, and adventure in The Legend of Zelda: Breath of the Wild. Travel across vast fields, through forests, and to mountain peaks as you discover what has become of the kingdom of Hyrule in this stunning Open-Air adventure. Now on Nintendo Switch, your journey is freer and more open than ever. Take your system anywhere, and adventure as Link any way you like.',
    developer: 'Nintendo EPD',
    publisher: 'Nintendo',
    platforms: ['Nintendo Switch', 'Wii U'],
    price: '$59.99',
    metacriticScore: 97,
    steamReviews: 'Universal Acclaim (Critics and Players)',
    esrbRating: 'E10+ for Everyone 10 and older',
    languages: ['English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese'],
    fileSize: '13.4 GB',
    systemRequirements: {
      minimum: {
        os: 'Nintendo Switch System Software 10.0.0 or later',
        processor: 'NVIDIA Custom Tegra processor',
        memory: '4 GB RAM',
        graphics: 'NVIDIA Custom Tegra GPU',
        storage: '13.4 GB available space'
      },
      recommended: {
        os: 'Nintendo Switch System Software 10.0.0 or later',
        processor: 'NVIDIA Custom Tegra processor',
        memory: '4 GB RAM',
        graphics: 'NVIDIA Custom Tegra GPU',
        storage: '13.4 GB available space (microSD recommended)'
      }
    },
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
      'https://images.pexels.com/photos/3945672/pexels-photo-3945672.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
  };

  // Comprehensive dummy reviews
  const dummyReviews = [
    {
      id: 'review-1',
      userId: '1',
      gameId: 'dummy-test-game',
      rating: 9.5,
      text: 'Absolutely phenomenal! The open world is breathtaking and the freedom of exploration is unmatched. The physics engine creates endless possibilities for creative problem-solving. This is easily one of the best adventure games ever made. Every mountain you see can be climbed, every area explored.',
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
      text: 'Great game with stunning visuals and innovative gameplay mechanics. The cooking and weapon systems add depth to the survival elements. Some weapon durability issues, but nothing game-breaking. Definitely worth the price. The shrines provide excellent puzzle variety.',
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
      text: 'The attention to detail is remarkable. Every corner of Hyrule tells a story, and the environmental storytelling is masterful. The soundtrack is also absolutely beautiful. I found myself just standing on mountaintops to take in the scenery and listen to the ambient sounds.',
      date: '2024-01-15',
      hasText: true,
      author: 'HyruleExplorer',
      authorAvatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    {
      id: 'review-4',
      userId: '4',
      gameId: 'dummy-test-game',
      rating: 8.0,
      text: 'Solid adventure game with great production values. The combat system takes some getting used to, but once you master it, it\'s very satisfying. Lots of content to keep you busy for months. The shrine quests are surprisingly creative and well-designed.',
      date: '2024-01-12',
      hasText: true,
      author: 'NintendoFan',
      authorAvatar: 'https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    {
      id: 'review-5',
      userId: '5',
      gameId: 'dummy-test-game',
      rating: 9.5,
      text: 'This game exceeded all my expectations. The world is vast and beautiful, and the sense of discovery is unmatched. A true masterpiece that sets a new standard for open-world adventure games. Link\'s journey feels truly epic.',
      date: '2024-01-10',
      hasText: true,
      author: 'OpenWorldLover',
      authorAvatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    {
      id: 'review-6',
      userId: '6',
      gameId: 'dummy-test-game',
      rating: 7.5,
      text: 'Beautiful game with an engaging world, but the weapon durability system can be frustrating at times. The graphics are stunning and the exploration is addictive. Worth playing if you enjoy open-world adventures with a focus on discovery.',
      date: '2024-01-08',
      hasText: true,
      author: 'GameCritic2024',
      authorAvatar: 'https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=150'
    }
  ];

  const topReviews = dummyReviews.filter(r => r.rating >= 9).slice(0, 3);
  const recentReviews = dummyReviews.slice(0, 5);

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
    { rating: 4, count: 0 },
    { rating: 3, count: 0 },
    { rating: 2, count: 0 },
    { rating: 1, count: 0 },
  ];

  const maxCount = Math.max(...ratingDistribution.map(d => d.count));

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Dummy Test Banner */}
        <div className="bg-green-600 text-white p-4 rounded-lg mb-6 text-center">
          <h2 className="text-lg font-semibold">🎮 Dummy Test Game Page</h2>
          <p className="text-sm opacity-90">This is a comprehensive test page showcasing what a fully-featured game page would look like</p>
        </div>

        {/* Game Header */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Game Cover and Info */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:flex-shrink-0">
                  {loading ? (
                    <div className="h-64 w-full md:h-80 md:w-64 bg-gray-700 animate-pulse flex items-center justify-center">
                      <span className="text-gray-400">Loading cover...</span>
                    </div>
                  ) : (
                  <img
                    src={dummyGame.coverImage}
                    alt={dummyGame.title}
                    className="h-64 w-full object-cover md:h-80 md:w-64"
                  />
                  )}
                </div>
                <div className="p-8">
                  <h1 className="text-3xl font-bold text-white mb-4">{dummyGame.title}</h1>
                  <div className="space-y-2 text-gray-400 mb-6">
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
                  <p className="text-gray-300 mb-6 leading-relaxed">{dummyGame.description}</p>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    <button className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      <Play className="h-4 w-4" />
                      Play Now
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                    <button className="flex items-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                    <button className="flex items-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                      <Bookmark className="h-4 w-4" />
                      Save
                    </button>
                  </div>
                </div>
              </div>
              
              {/* User Actions */}
              <div className="flex items-center gap-4 p-6 border-t border-gray-700">
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
                
                <div className="flex items-center gap-3 ml-4">
                  <Link
                    to={`/review/${dummyGame.id}`}
                    className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center hover:bg-purple-700 transition-colors"
                  >
                    <ScrollText className="h-4 w-4 text-white" />
                  </Link>
                  <Link
                    to={`/review/${dummyGame.id}`}
                    className="text-gray-300 text-sm hover:text-purple-400 transition-colors"
                  >
                    Write a Review
                  </Link>
                </div>
              </div>
            </div>

            {/* Screenshots */}
            <div className="bg-gray-800 rounded-lg p-6 mt-8">
              <h3 className="text-xl font-semibold text-white mb-4">Screenshots & Media</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {dummyGame.screenshots.map((screenshot, index) => (
                  <img
                    key={index}
                    src={screenshot}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg hover:scale-105 transition-transform cursor-pointer"
                  />
                ))}
              </div>
            </div>

            {/* Game Features */}
            <div className="bg-gray-800 rounded-lg p-6 mt-8">
              <h3 className="text-xl font-semibold text-white mb-4">Features</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {dummyGame.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* System Requirements */}
            <div className="bg-gray-800 rounded-lg p-6 mt-8">
              <h3 className="text-xl font-semibold text-white mb-4">System Requirements</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium text-purple-400 mb-3">Minimum</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong className="text-gray-300">OS:</strong> <span className="text-gray-400">{dummyGame.systemRequirements.minimum.os}</span></div>
                    <div><strong className="text-gray-300">Processor:</strong> <span className="text-gray-400">{dummyGame.systemRequirements.minimum.processor}</span></div>
                    <div><strong className="text-gray-300">Memory:</strong> <span className="text-gray-400">{dummyGame.systemRequirements.minimum.memory}</span></div>
                    <div><strong className="text-gray-300">Graphics:</strong> <span className="text-gray-400">{dummyGame.systemRequirements.minimum.graphics}</span></div>
                    <div><strong className="text-gray-300">Storage:</strong> <span className="text-gray-400">{dummyGame.systemRequirements.minimum.storage}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-green-400 mb-3">Recommended</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong className="text-gray-300">OS:</strong> <span className="text-gray-400">{dummyGame.systemRequirements.recommended.os}</span></div>
                    <div><strong className="text-gray-300">Processor:</strong> <span className="text-gray-400">{dummyGame.systemRequirements.recommended.processor}</span></div>
                    <div><strong className="text-gray-300">Memory:</strong> <span className="text-gray-400">{dummyGame.systemRequirements.recommended.memory}</span></div>
                    <div><strong className="text-gray-300">Graphics:</strong> <span className="text-gray-400">{dummyGame.systemRequirements.recommended.graphics}</span></div>
                    <div><strong className="text-gray-300">Storage:</strong> <span className="text-gray-400">{dummyGame.systemRequirements.recommended.storage}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Summary and Additional Info */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Community Rating</h3>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-purple-400 mb-2">
                  {averageRating.toFixed(1)}
                </div>
                <StarRating rating={averageRating} size="lg" />
                <div className="text-gray-400 mt-2">{dummyReviews.length} reviews</div>
              </div>
              
              {/* Rating Distribution */}
              <div className="space-y-2">
                {ratingDistribution.map((item) => (
                  <div key={item.rating} className="flex items-center gap-2">
                    <span className="text-gray-400 w-6">{item.rating}</span>
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

            {/* Additional Game Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Game Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <strong className="text-gray-300">Metacritic Score:</strong>
                  <span className="text-green-400 ml-2">{dummyGame.metacriticScore}/100</span>
                </div>
                <div>
                  <strong className="text-gray-300">Steam Reviews:</strong>
                  <span className="text-blue-400 ml-2">{dummyGame.steamReviews}</span>
                </div>
                <div>
                  <strong className="text-gray-300">ESRB Rating:</strong>
                  <span className="text-gray-400 ml-2">{dummyGame.esrbRating}</span>
                </div>
                <div>
                  <strong className="text-gray-300">File Size:</strong>
                  <span className="text-gray-400 ml-2">{dummyGame.fileSize}</span>
                </div>
                <div>
                  <strong className="text-gray-300">Languages:</strong>
                  <span className="text-gray-400 ml-2">{dummyGame.languages.join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Community Stats */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Community</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    <span className="text-gray-300">Achievements</span>
                  </div>
                  <span className="text-white font-semibold">47</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-blue-400" />
                    <span className="text-gray-300">Players</span>
                  </div>
                  <span className="text-white font-semibold">2.3M</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-400" />
                    <span className="text-gray-300">Avg. Playtime</span>
                  </div>
                  <span className="text-white font-semibold">67h</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Top Reviews */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Top Reviews</h2>
            <div className="space-y-4">
              {topReviews.map((review) => (
                <ReviewCard key={review.id} review={review} compact />
              ))}
            </div>
          </div>

          {/* Recent Reviews */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Recent Reviews</h2>
            <div className="space-y-4">
              {recentReviews.map((review) => (
                <ReviewCard key={review.id} review={review} compact />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};