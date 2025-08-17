import React, { useState, useEffect, useCallback } from 'react';
import { X, Gamepad2, Play, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';

interface Game {
  id: string;
  igdb_id?: string | number; // IGDB ID for navigation
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

  // Load all games for the user (started or completed games from game_progress table)
  const loadAllGames = useCallback(async () => {
    setLoadingAll(true);
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
            igdb_id,
            name,
            pic_url,
            genre,
            release_date
          )
        `)
        .eq('user_id', parseInt(userId))
        .or('started.eq.true,completed.eq.true')
        .order('started_date', { ascending: false });

      if (error) throw error;

      const gamesData = (data || [])
        .filter(item => item.game)
        .map(item => ({
          id: item.game.id.toString(),
          igdb_id: item.game.igdb_id,
          title: item.game.name || 'Unknown Game',
          coverImage: item.game.pic_url || '/default-cover.png',
          genre: item.game.genre || '',
          releaseDate: item.game.release_date || '',
          started: item.started,
          completed: item.completed,
          started_date: item.started_date,
          completed_date: item.completed_date
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
            igdb_id,
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
          igdb_id: item.game.igdb_id,
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
            igdb_id,
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
          igdb_id: item.game.igdb_id,
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
                    to={`/game/${game.igdb_id || game.id}`}
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
                      
                      {/* Progress indicators for all tabs */}
                      {activeTab === 'all' && game.completed && (
                        <div className="absolute top-1 right-1 bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-3 w-3" />
                        </div>
                      )}
                      
                      {activeTab === 'all' && game.started && !game.completed && (
                        <div className="absolute top-1 right-1 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center">
                          <Play className="h-3 w-3" />
                        </div>
                      )}
                      
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

              {/* Mobile Grid */}
              <div className="md:hidden grid grid-cols-4 gap-2">
                {currentGames.map((game) => (
                  <Link
                    key={game.id}
                    to={`/game/${game.igdb_id || game.id}`}
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
                      
                      {/* Progress indicators for all tabs */}
                      {activeTab === 'all' && game.completed && (
                        <div className="absolute top-1 right-1 bg-green-600 text-white w-5 h-5 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-2.5 w-2.5" />
                        </div>
                      )}
                      
                      {activeTab === 'all' && game.started && !game.completed && (
                        <div className="absolute top-1 right-1 bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center">
                          <Play className="h-2.5 w-2.5" />
                        </div>
                      )}
                      
                      {activeTab === 'started' && (
                        <div className="absolute top-1 right-1 bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center">
                          <Play className="h-2.5 w-2.5" />
                        </div>
                      )}
                      
                      {activeTab === 'finished' && (
                        <div className="absolute top-1 right-1 bg-green-600 text-white w-5 h-5 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-2.5 w-2.5" />
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
