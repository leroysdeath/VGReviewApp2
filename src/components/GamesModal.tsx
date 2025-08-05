import React, { useState, useEffect, useCallback } from 'react';
import { X, Gamepad2, Play, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';

interface Game {
  id: string;
  title: string;
  coverImage: string;
  releaseDate: string;
  genre: string;
  rating?: number;
  started?: boolean;
  completed?: boolean;
  started_date?: string;
  completed_date?: string;
}

interface GamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  initialTab: 'all' | 'started' | 'finished';
}

export const GamesModal: React.FC<GamesModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  initialTab
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'started' | 'finished'>(initialTab);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [startedGames, setStartedGames] = useState<Game[]>([]);
  const [finishedGames, setFinishedGames] = useState<Game[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingStarted, setLoadingStarted] = useState(false);
  const [loadingFinished, setLoadingFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isMobile } = useResponsive();

  // Update active tab when initialTab changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Load all games for the user (from ratings table)
  const loadAllGames = useCallback(async () => {
    setLoadingAll(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('rating')
        .select(`
          rating,
          post_date_time,
          game:game_id (
            id,
            name,
            pic_url,
            genre,
            release_date
          )
        `)
        .eq('user_id', parseInt(userId))
        .order('rating', { ascending: false });

      if (error) throw error;

      const gamesData = (data || [])
        .filter(item => item.game)
        .map(item => ({
          id: item.game.id.toString(),
          title: item.game.name || 'Unknown Game',
          coverImage: item.game.pic_url || '/default-cover.png',
          genre: item.game.genre || '',
          releaseDate: item.game.release_date || '',
          rating: item.rating
        }));

      setAllGames(gamesData);
    } catch (error) {
      console.error('Error loading all games:', error);
      setError('Failed to load games');
      setAllGames([]);
    } finally {
      setLoadingAll(false);
    }
  }, [userId]);

  // Load started games
  const loadStartedGames = useCallback(async () => {
    setLoadingStarted(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('game_progress')
        .select(`
          started,
          started_date,
          completed,
          completed_date,
          game:game_id (
            id,
            name,
            pic_url,
            genre,
            release_date
          )
        `)
        .eq('user_id', parseInt(userId))
        .eq('started', true)
        .eq('completed', false)
        .order('started_date', { ascending: false });

      if (error) throw error;

      const gamesData = (data || [])
        .filter(item => item.game)
        .map(item => ({
          id: item.game.id.toString(),
          title: item.game.name || 'Unknown Game',
          coverImage: item.game.pic_url || '/default-cover.png',
          genre: item.game.genre || '',
          releaseDate: item.game.release_date || '',
          started: item.started,
          completed: item.completed,
          started_date: item.started_date,
          completed_date: item.completed_date
        }));

      setStartedGames(gamesData);
    } catch (error) {
      console.error('Error loading started games:', error);
      setError('Failed to load started games');
      setStartedGames([]);
    } finally {
      setLoadingStarted(false);
    }
  }, [userId]);

  // Load finished games
  const loadFinishedGames = useCallback(async () => {
    setLoadingFinished(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('game_progress')
        .select(`
          completed,
          completed_date,
          started_date,
          game:game_id (
            id,
            name,
            pic_url,
            genre,
            release_date
          )
        `)
        .eq('user_id', parseInt(userId))
        .eq('completed', true)
        .order('completed_date', { ascending: false });

      if (error) throw error;

      const gamesData = (data || [])
        .filter(item => item.game)
        .map(item => ({
          id: item.game.id.toString(),
          title: item.game.name || 'Unknown Game',
          coverImage: item.game.pic_url || '/default-cover.png',
          genre: item.game.genre || '',
          releaseDate: item.game.release_date || '',
          completed: item.completed,
          started_date: item.started_date,
          completed_date: item.completed_date
        }));

      setFinishedGames(gamesData);
    } catch (error) {
      console.error('Error loading finished games:', error);
      setError('Failed to load finished games');
      setFinishedGames([]);
    } finally {
      setLoadingFinished(false);
    }
  }, [userId]);

  // Load data when modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'all') {
        loadAllGames();
      } else if (activeTab === 'started') {
        loadStartedGames();
      } else if (activeTab === 'finished') {
        loadFinishedGames();
      }
    }
  }, [isOpen, activeTab, userId, loadAllGames, loadStartedGames, loadFinishedGames]);

  if (!isOpen) return null;

  const getCurrentGames = () => {
    switch (activeTab) {
      case 'all':
        return allGames;
      case 'started':
        return startedGames;
      case 'finished':
        return finishedGames;
      default:
        return [];
    }
  };

  const getCurrentLoading = () => {
    switch (activeTab) {
      case 'all':
        return loadingAll;
      case 'started':
        return loadingStarted;
      case 'finished':
        return loadingFinished;
      default:
        return false;
    }
  };

  const currentGames = getCurrentGames();
  const isLoading = getCurrentLoading();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-800 rounded-lg w-full max-h-[90vh] flex flex-col ${
        isMobile ? 'max-w-sm' : 'max-w-4xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">{userName}'s Games</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'all'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              All Games
            </div>
          </button>
          <button
            onClick={() => setActiveTab('started')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'started'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Play className="h-4 w-4" />
              Started
            </div>
          </button>
          <button
            onClick={() => setActiveTab('finished')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'finished'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Finished
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-red-400">⚠️</span>
                <p className="text-red-300 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : currentGames.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <Gamepad2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {activeTab === 'all' && 'No games found'}
                {activeTab === 'started' && 'No started games yet'}
                {activeTab === 'finished' && 'No finished games yet'}
              </p>
            </div>
          ) : (
            /* Games Grid */
            <div>
              {/* Desktop/Tablet Grid */}
              <div className={`hidden md:grid gap-4 ${
                isMobile ? 'grid-cols-4' : 'grid-cols-8'
              }`}>
                {currentGames.map((game) => (
                  <Link
                    key={game.id}
                    to={`/game/${game.id}`}
                    className="group relative hover:scale-105 transition-transform"
                    onClick={onClose}
                  >
                    <div className="relative">
                      <img
                        src={game.coverImage}
                        alt={game.title}
                        className="w-full aspect-[3/4] object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = '/default-cover.png';
                        }}
                      />
                      
                      {/* Rating overlay for 'all' tab */}
                      {activeTab === 'all' && game.rating && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 px-1 py-0.5">
                          <div className="text-center">
                            <span className="text-white text-xs font-bold">
                              {game.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Progress indicators for started/finished tabs */}
                      {activeTab === 'started' && (
                        <div className="absolute top-1 right-1 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center">
                          <Play className="h-3 w-3" />
                        </div>
                      )}
                      
                      {activeTab === 'finished' && (
                        <div className="absolute top-1 right-1 bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-1">
                      <h3 className="text-white text-xs font-medium group-hover:text-purple-400 transition-colors line-clamp-2">
                        {game.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Mobile List */}
              <div className="md:hidden space-y-3">
                {currentGames.map((game) => (
                  <Link
                    key={game.id}
                    to={`/game/${game.id}`}
                    className="group flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    onClick={onClose}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={game.coverImage}
                        alt={game.title}
                        className="w-12 h-16 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = '/default-cover.png';
                        }}
                      />
                      
                      {/* Rating overlay for mobile 'all' tab */}
                      {activeTab === 'all' && game.rating && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 px-1 py-0.5">
                          <div className="text-center">
                            <span className="text-white text-xs font-bold">
                              {game.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Progress indicators for mobile */}
                        {activeTab === 'started' && (
                          <div className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center">
                            <Play className="h-3 w-3" />
                          </div>
                        )}
                        {activeTab === 'finished' && (
                          <div className="bg-green-600 text-white w-5 h-5 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-3 w-3" />
                          </div>
                        )}
                        
                        <h3 className="text-white font-medium text-sm group-hover:text-purple-400 transition-colors truncate">
                          {game.title}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {game.genre && <span>{game.genre}</span>}
                        {activeTab === 'all' && game.rating && (
                          <>
                            {game.genre && <span>•</span>}
                            <span className="text-yellow-400">★ {game.rating.toFixed(1)}</span>
                          </>
                        )}
                        {(activeTab === 'started' || activeTab === 'finished') && game.started_date && (
                          <>
                            {game.genre && <span>•</span>}
                            <span>Started {new Date(game.started_date).toLocaleDateString()}</span>
                          </>
                        )}
                        {activeTab === 'finished' && game.completed_date && (
                          <>
                            <span>•</span>
                            <span>Finished {new Date(game.completed_date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
