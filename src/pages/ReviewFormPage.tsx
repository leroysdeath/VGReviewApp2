import React, { useState } from 'react';
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Star, Save, Eye, EyeOff } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { useGames } from '../hooks/useGames';
import { igdbService, Game } from '../services/igdbApi';

export const ReviewFormPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameSearch, setGameSearch] = useState('');
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [completionStatus, setCompletionStatus] = useState('completed');
  const [playTime, setPlayTime] = useState('');
  const [platform, setPlatform] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const { games, searchGames } = useGames();

  useEffect(() => {
    // Load game if gameId is provided
    if (gameId) {
      const loadGame = async () => {
        try {
          const game = await igdbService.getGameByStringId(gameId);
          if (game) {
            setSelectedGame(game);
          }
        } catch (error) {
          console.error('Failed to load game:', error);
        }
      };
      loadGame();
    }
  }, [gameId]);

  useEffect(() => {
    // Search games when user types
    if (gameSearch.trim()) {
      const timeoutId = setTimeout(() => {
        searchGames(gameSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [gameSearch, searchGames]);

  const filteredGames = games.filter(game =>
    game.title.toLowerCase().includes(gameSearch.toLowerCase())
  );

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setGameSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame || rating === 0) return;

    const reviewData = {
      gameId: selectedGame.id,
      rating,
      reviewText,
      completionStatus,
      playTime,
      platform,
      isPrivate,
      tags,
      date: new Date().toISOString().split('T')[0]
    };

    console.log('Review submitted:', reviewData);
    navigate(`/game/${selectedGame.id}`);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-800 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-8">
            {selectedGame ? `Review: ${selectedGame.title}` : 'Write a Review'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Game Selection */}
            {!selectedGame && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Game
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={gameSearch}
                    onChange={(e) => setGameSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="Search for a game..."
                  />
                </div>
                {gameSearch && (
                  <div className="mt-2 bg-gray-700 border border-gray-600 rounded-lg max-h-48 overflow-y-auto">
                    {filteredGames.map((game) => (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => handleGameSelect(game)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-600 transition-colors text-left"
                      >
                        <img
                          src={game.coverImage}
                          alt={game.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <div className="text-white font-medium">{game.title}</div>
                          <div className="text-gray-400 text-sm">{game.releaseDate}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected Game Display */}
            {selectedGame && (
              <div className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
                <img
                  src={selectedGame.coverImage}
                  alt={selectedGame.title}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{selectedGame.title}</h3>
                  <p className="text-gray-400 text-sm">{selectedGame.releaseDate}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGame(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Change
                </button>
              </div>
            )}

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Rating *
              </label>
              <div className="flex items-center gap-4">
                <StarRating 
                  rating={rating} 
                  onRatingChange={setRating}
                  interactive 
                  size="lg" 
                />
                <span className="text-2xl font-bold text-white">
                  {rating > 0 ? rating.toFixed(1) : '--'}
                </span>
              </div>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Review (Optional)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="Share your thoughts about this game..."
              />
              <div className="mt-1 text-sm text-gray-400">
                {reviewText.length} characters
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Completion Status
                </label>
                <select
                  value={completionStatus}
                  onChange={(e) => setCompletionStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="completed">Completed</option>
                  <option value="playing">Currently Playing</option>
                  <option value="dropped">Dropped</option>
                  <option value="on-hold">On Hold</option>
                  <option value="plan-to-play">Plan to Play</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Play Time (Optional)
                </label>
                <input
                  type="text"
                  value={playTime}
                  onChange={(e) => setPlayTime(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="e.g., 25 hours"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Platform</option>
                  <option value="pc">PC</option>
                  <option value="ps5">PlayStation 5</option>
                  <option value="xbox">Xbox Series X/S</option>
                  <option value="nintendo">Nintendo Switch</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Add Tags
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="Add a tag..."
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-gray-400 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Privacy Setting */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
                />
                <span className="text-gray-300">Make this review private</span>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={!selectedGame || rating === 0}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                Publish Review
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};