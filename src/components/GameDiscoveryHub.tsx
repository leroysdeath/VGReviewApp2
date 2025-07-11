import React, { useState, useEffect } from 'react';
import { Compass, Search, Filter, Gamepad, Heart, Clock, Sparkles, BarChart2, Calendar } from 'lucide-react';
import { TrendingGamesCarousel } from './TrendingGamesCarousel';
import { GameRecommendations } from './GameRecommendations';
import { GameComparisonTool } from './GameComparisonTool';
import { AdvancedGameFilters } from './AdvancedGameFilters';
import { GameReleaseCalendar } from './GameReleaseCalendar';
import { GenreBrowser } from './GenreBrowser';
import { GameMoodSelector } from './GameMoodSelector';
import { SimilarGamesRecommender } from './SimilarGamesRecommender';
import { RecentlyViewedGames, addGameToRecentlyViewed } from './RecentlyViewedGames';
import { GameWishlist, toggleGameInWishlist, isGameInWishlist } from './GameWishlist';
import { Game } from '../services/igdbApi';
import { useResponsive } from '../hooks/useResponsive';

interface GameDiscoveryHubProps {
  onSearch: (query: string) => Promise<Game[]>;
  onGetTrendingGames: () => Promise<Game[]>;
  onGetRecommendedGames: (preferences?: string[]) => Promise<Game[]>;
  onGetSimilarGames: (gameId: string) => Promise<Game[]>;
  onGetUpcomingGames: () => Promise<Game[]>;
  onGetGamesByGenre: (genreId: string) => Promise<Game[]>;
  onGetGamesByMood: (moods: string[]) => Promise<Game[]>;
  className?: string;
}

export const GameDiscoveryHub: React.FC<GameDiscoveryHubProps> = ({
  onSearch,
  onGetTrendingGames,
  onGetRecommendedGames,
  onGetSimilarGames,
  onGetUpcomingGames,
  onGetGamesByGenre,
  onGetGamesByMood,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<string>('trending');
  const [trendingGames, setTrendingGames] = useState<Game[]>([]);
  const [recommendedGames, setRecommendedGames] = useState<Game[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({
    trending: false,
    recommended: false,
    upcoming: false,
  });
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [moodGames, setMoodGames] = useState<Game[]>([]);
  const { isMobile } = useResponsive();

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      // Load trending games
      setLoading(prev => ({ ...prev, trending: true }));
      try {
        const trending = await onGetTrendingGames();
        setTrendingGames(trending);
      } catch (error) {
        console.error('Error loading trending games:', error);
      } finally {
        setLoading(prev => ({ ...prev, trending: false }));
      }
      
      // Load recommended games
      setLoading(prev => ({ ...prev, recommended: true }));
      try {
        const recommended = await onGetRecommendedGames();
        setRecommendedGames(recommended);
      } catch (error) {
        console.error('Error loading recommended games:', error);
      } finally {
        setLoading(prev => ({ ...prev, recommended: false }));
      }
      
      // Load upcoming games
      setLoading(prev => ({ ...prev, upcoming: true }));
      try {
        const upcoming = await onGetUpcomingGames();
        setUpcomingGames(upcoming);
      } catch (error) {
        console.error('Error loading upcoming games:', error);
      } finally {
        setLoading(prev => ({ ...prev, upcoming: false }));
      }
    };
    
    loadInitialData();
  }, [onGetTrendingGames, onGetRecommendedGames, onGetUpcomingGames]);

  // Load games by mood when moods change
  useEffect(() => {
    const loadGamesByMood = async () => {
      if (selectedMoods.length === 0) {
        setMoodGames([]);
        return;
      }
      
      try {
        const games = await onGetGamesByMood(selectedMoods);
        setMoodGames(games);
      } catch (error) {
        console.error('Error loading games by mood:', error);
      }
    };
    
    loadGamesByMood();
  }, [selectedMoods, onGetGamesByMood]);

  // Handle game selection
  const handleGameSelect = (game: Game) => {
    // Add to recently viewed
    addGameToRecentlyViewed(game);
  };

  // Handle mood selection
  const handleMoodSelect = (moods: string[]) => {
    setSelectedMoods(moods);
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'trending':
        return (
          <div className="space-y-8">
            <TrendingGamesCarousel
              games={trendingGames}
              loading={loading.trending}
              onGameSelect={handleGameSelect}
            />
            
            <GameRecommendations
              games={recommendedGames}
              title="Recommended For You"
              loading={loading.recommended}
              onGameSelect={handleGameSelect}
              personalizedReason="Based on your gaming preferences"
            />
            
            <RecentlyViewedGames
              maxItems={6}
              onGameSelect={handleGameSelect}
            />
          </div>
        );
      
      case 'discover':
        return (
          <div className="space-y-8">
            <GameMoodSelector
              onMoodSelect={handleMoodSelect}
              multiSelect={true}
            />
            
            {selectedMoods.length > 0 && (
              <GameRecommendations
                games={moodGames}
                title="Games Matching Your Mood"
                onGameSelect={handleGameSelect}
                personalizedReason={`Based on your selected moods (${selectedMoods.length})`}
              />
            )}
            
            <GenreBrowser
              genres={[
                { id: 'action', name: 'Action', description: 'Fast-paced games focused on combat and movement', coverImage: '', gameCount: 1245 },
                { id: 'adventure', name: 'Adventure', description: 'Story-driven games with exploration', coverImage: '', gameCount: 867 },
                { id: 'rpg', name: 'RPG', description: 'Role-playing games with character development', coverImage: '', gameCount: 753 },
                { id: 'strategy', name: 'Strategy', description: 'Games that emphasize tactical thinking', coverImage: '', gameCount: 542 },
                { id: 'simulation', name: 'Simulation', description: 'Games that simulate real-world activities', coverImage: '', gameCount: 389 },
                { id: 'sports', name: 'Sports', description: 'Games that simulate traditional sports', coverImage: '', gameCount: 421 },
                { id: 'racing', name: 'Racing', description: 'Games focused on competitive driving', coverImage: '', gameCount: 287 },
                { id: 'puzzle', name: 'Puzzle', description: 'Games that challenge problem-solving skills', coverImage: '', gameCount: 632 },
                { id: 'fighting', name: 'Fighting', description: 'Combat-focused games featuring one-on-one battles', coverImage: '', gameCount: 178 },
                { id: 'shooter', name: 'Shooter', description: 'Games centered around weapon-based combat', coverImage: '', gameCount: 523 }
              ]}
              onGenreSelect={(genreId) => console.log(`Selected genre: ${genreId}`)}
            />
          </div>
        );
      
      case 'compare':
        return (
          <div className="space-y-8">
            <GameComparisonTool
              onSearch={onSearch}
            />
            
            <SimilarGamesRecommender
              onSearch={onSearch}
              onGetSimilarGames={onGetSimilarGames}
            />
          </div>
        );
      
      case 'calendar':
        return (
          <div className="space-y-8">
            <GameReleaseCalendar
              games={upcomingGames}
              loading={loading.upcoming}
              onGameSelect={handleGameSelect}
            />
          </div>
        );
      
      case 'wishlist':
        return (
          <div className="space-y-8">
            <GameWishlist />
          </div>
        );
      
      case 'advanced':
        return (
          <div className="space-y-8">
            <AdvancedGameFilters
              onFilterChange={(filters) => console.log('Filters changed:', filters)}
              totalResults={1245}
            />
          </div>
        );
      
      default:
        return (
          <div className="text-center py-12">
            <Compass className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Select a discovery method</h3>
            <p className="text-gray-400">
              Choose from the tabs above to find your next favorite game
            </p>
          </div>
        );
    }
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className={`${className}`}>
        {/* Mobile tabs */}
        <div className="flex overflow-x-auto hide-scrollbar mb-6 pb-2">
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex-shrink-0 flex flex-col items-center px-4 py-2 ${
              activeTab === 'trending'
                ? 'text-game-purple border-b-2 border-game-purple'
                : 'text-gray-400'
            }`}
          >
            <Sparkles className="h-5 w-5 mb-1" />
            <span className="text-xs">Trending</span>
          </button>
          
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-shrink-0 flex flex-col items-center px-4 py-2 ${
              activeTab === 'discover'
                ? 'text-game-purple border-b-2 border-game-purple'
                : 'text-gray-400'
            }`}
          >
            <Compass className="h-5 w-5 mb-1" />
            <span className="text-xs">Discover</span>
          </button>
          
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex-shrink-0 flex flex-col items-center px-4 py-2 ${
              activeTab === 'compare'
                ? 'text-game-purple border-b-2 border-game-purple'
                : 'text-gray-400'
            }`}
          >
            <BarChart2 className="h-5 w-5 mb-1" />
            <span className="text-xs">Compare</span>
          </button>
          
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-shrink-0 flex flex-col items-center px-4 py-2 ${
              activeTab === 'calendar'
                ? 'text-game-purple border-b-2 border-game-purple'
                : 'text-gray-400'
            }`}
          >
            <Calendar className="h-5 w-5 mb-1" />
            <span className="text-xs">Calendar</span>
          </button>
          
          <button
            onClick={() => setActiveTab('wishlist')}
            className={`flex-shrink-0 flex flex-col items-center px-4 py-2 ${
              activeTab === 'wishlist'
                ? 'text-game-purple border-b-2 border-game-purple'
                : 'text-gray-400'
            }`}
          >
            <Heart className="h-5 w-5 mb-1" />
            <span className="text-xs">Wishlist</span>
          </button>
          
          <button
            onClick={() => setActiveTab('advanced')}
            className={`flex-shrink-0 flex flex-col items-center px-4 py-2 ${
              activeTab === 'advanced'
                ? 'text-game-purple border-b-2 border-game-purple'
                : 'text-gray-400'
            }`}
          >
            <Filter className="h-5 w-5 mb-1" />
            <span className="text-xs">Filters</span>
          </button>
        </div>
        
        {/* Tab content */}
        {renderTabContent()}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={`${className}`}>
      {/* Desktop tabs */}
      <div className="flex items-center border-b border-gray-700 mb-8">
        <button
          onClick={() => setActiveTab('trending')}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 -mb-px ${
            activeTab === 'trending'
              ? 'text-game-purple border-game-purple'
              : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
          } transition-colors`}
        >
          <Sparkles className="h-5 w-5" />
          <span>Trending</span>
        </button>
        
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 -mb-px ${
            activeTab === 'discover'
              ? 'text-game-purple border-game-purple'
              : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
          } transition-colors`}
        >
          <Compass className="h-5 w-5" />
          <span>Discover</span>
        </button>
        
        <button
          onClick={() => setActiveTab('compare')}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 -mb-px ${
            activeTab === 'compare'
              ? 'text-game-purple border-game-purple'
              : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
          } transition-colors`}
        >
          <BarChart2 className="h-5 w-5" />
          <span>Compare</span>
        </button>
        
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 -mb-px ${
            activeTab === 'calendar'
              ? 'text-game-purple border-game-purple'
              : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
          } transition-colors`}
        >
          <Calendar className="h-5 w-5" />
          <span>Release Calendar</span>
        </button>
        
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 -mb-px ${
            activeTab === 'wishlist'
              ? 'text-game-purple border-game-purple'
              : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
          } transition-colors`}
        >
          <Heart className="h-5 w-5" />
          <span>Wishlist</span>
        </button>
        
        <button
          onClick={() => setActiveTab('advanced')}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 -mb-px ${
            activeTab === 'advanced'
              ? 'text-game-purple border-game-purple'
              : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
          } transition-colors`}
        >
          <Filter className="h-5 w-5" />
          <span>Advanced Filters</span>
        </button>
        
        <div className="flex-1"></div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Quick search..."
            className="px-4 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-game-purple"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {/* Tab content */}
      {renderTabContent()}
    </div>
  );
};