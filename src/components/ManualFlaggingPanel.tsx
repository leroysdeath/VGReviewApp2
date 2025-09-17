import React, { useState, useEffect } from 'react';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Flag, 
  Clock,
  User,
  TrendingUp,
  Star,
  Users
} from 'lucide-react';
import { gameFlagService, type FlaggedGame, type FlagSummary, type FlagType } from '../services/gameFlagService';

interface GameSearchResult {
  id: number;
  name: string;
  developer?: string;
  publisher?: string;
  category?: number;
  greenlight_flag: boolean;
  redlight_flag: boolean;
  flag_reason?: string;
  flagged_at?: string;
  total_rating?: number;
  rating_count?: number;
  follows?: number;
  popularity_score?: number;
}

export const ManualFlaggingPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GameSearchResult[]>([]);
  const [flaggedGames, setFlaggedGames] = useState<FlaggedGame[]>([]);
  const [summary, setSummary] = useState<FlagSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'search' | 'flagged' | 'conflicts'>('search');
  const [conflictingFlags, setConflictingFlags] = useState<FlaggedGame[]>([]);

  // Load initial data
  useEffect(() => {
    loadFlagSummary();
    loadFlaggedGames();
    loadConflictingFlags();
  }, []);

  const loadFlagSummary = async () => {
    const result = await gameFlagService.getFlagSummary();
    if (result.success) {
      setSummary(result.data!);
    }
  };

  const loadFlaggedGames = async () => {
    const result = await gameFlagService.getFlaggedGames();
    if (result.success) {
      setFlaggedGames(result.data!);
    }
  };

  const loadConflictingFlags = async () => {
    const result = await gameFlagService.getConflictingFlags();
    if (result.success) {
      setConflictingFlags(result.data!);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const result = await gameFlagService.searchGamesForFlagging(searchQuery);
      if (result.success) {
        setSearchResults(result.data!);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlag = async (gameId: number, flagType: FlagType, reason?: string) => {
    const result = await gameFlagService.setGameFlag(gameId, flagType, reason);
    if (result.success) {
      // Refresh data
      loadFlagSummary();
      loadFlaggedGames();
      handleSearch(); // Refresh search results
      alert(`Successfully ${flagType === 'clear' ? 'cleared flag for' : 'flagged'} game!`);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const getFlagIcon = (game: GameSearchResult | FlaggedGame) => {
    if (game.greenlight_flag) {
      return <CheckCircle className="h-5 w-5 text-green-400" />;
    }
    if (game.redlight_flag) {
      return <XCircle className="h-5 w-5 text-red-400" />;
    }
    return <Flag className="h-5 w-5 text-gray-400" />;
  };

  const getCategoryLabel = (category?: number) => {
    const labels: Record<number, string> = {
      0: 'Main game',
      1: 'DLC/Add-on',
      2: 'Expansion',
      3: 'Bundle',
      4: 'Standalone expansion',
      5: 'Mod',
      6: 'Episode',
      7: 'Season',
      8: 'Remake',
      9: 'Remaster',
      10: 'Expanded game',
      11: 'Port',
      12: 'Fork',
      13: 'Pack',
      14: 'Update'
    };
    return category !== undefined ? labels[category] || `Unknown(${category})` : 'Unknown';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Total Flagged</span>
              <Flag className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{summary.total_flagged}</div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Greenlight</span>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400">{summary.greenlight_count}</div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Redlight</span>
              <XCircle className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400">{summary.redlight_count}</div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Recent (24h)</span>
              <Clock className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400">{summary.recent_flags_24h}</div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Last Flag</span>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-sm font-medium">{formatDate(summary.most_recent_flag)}</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="flex space-x-4">
        {(['search', 'flagged', 'conflicts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 rounded font-medium ${
              selectedTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab === 'search' && '🔍 Search & Flag'}
            {tab === 'flagged' && '🏷️ Flagged Games'}
            {tab === 'conflicts' && '⚠️ Conflicts'}
            {tab === 'conflicts' && conflictingFlags.length > 0 && (
              <span className="ml-1 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                {conflictingFlags.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Search Tab */}
      {selectedTab === 'search' && (
        <div className="space-y-4">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Search Games to Flag</h3>
            
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games by name, developer, or publisher..."
                className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={isLoading || !searchQuery.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold"
              >
                {isLoading ? '🔄 Searching...' : '🔍 Search'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h4 className="text-lg font-semibold mb-4">Search Results</h4>
              <div className="space-y-3">
                {searchResults.map(game => (
                  <GameFlagRow
                    key={game.id}
                    game={game}
                    onFlag={handleFlag}
                    showMetrics={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Flagged Games Tab */}
      {selectedTab === 'flagged' && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-4">All Flagged Games</h3>
          {flaggedGames.length === 0 ? (
            <p className="text-gray-400">No games have been flagged yet.</p>
          ) : (
            <div className="space-y-3">
              {flaggedGames.map(game => (
                <FlaggedGameRow
                  key={game.id}
                  game={game}
                  onFlag={handleFlag}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conflicts Tab */}
      {selectedTab === 'conflicts' && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
            Flag Conflicts
          </h3>
          {conflictingFlags.length === 0 ? (
            <p className="text-gray-400">No conflicting flags detected.</p>
          ) : (
            <div className="space-y-3">
              {conflictingFlags.map(game => (
                <FlaggedGameRow
                  key={game.id}
                  game={game}
                  onFlag={handleFlag}
                  showConflict={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Game Flag Row Component for search results
const GameFlagRow: React.FC<{
  game: GameSearchResult;
  onFlag: (gameId: number, flagType: FlagType, reason?: string) => void;
  showMetrics?: boolean;
}> = ({ game, onFlag, showMetrics = false }) => {
  const [reason, setReason] = useState('');

  const handleFlag = (flagType: FlagType) => {
    if (flagType !== 'clear' && !reason.trim()) {
      alert('Please provide a reason for flagging this game.');
      return;
    }
    onFlag(game.id, flagType, reason.trim() || undefined);
    setReason('');
  };

  const getCategoryColor = (category?: number) => {
    if (category === 5) return 'text-red-400'; // Mod
    if (category === 1) return 'text-yellow-400'; // DLC
    if (category === 3 || category === 11 || category === 13) return 'text-orange-400'; // Bundle/Port/Pack
    return 'text-gray-400';
  };

  return (
    <div className="bg-gray-700 p-4 rounded border-l-4 border-gray-600">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="h-4 w-4 text-gray-400" />
            <h5 className="font-semibold">{game.name}</h5>
            {game.greenlight_flag && <CheckCircle className="h-4 w-4 text-green-400" />}
            {game.redlight_flag && <XCircle className="h-4 w-4 text-red-400" />}
          </div>
          
          <div className="text-sm text-gray-300 space-y-1">
            <div>Developer: {game.developer || 'Unknown'}</div>
            <div>Publisher: {game.publisher || 'Unknown'}</div>
            <div className={getCategoryColor(game.category)}>
              Category: {getCategoryLabel(game.category)}
            </div>
            
            {showMetrics && (
              <div className="flex gap-4 text-xs mt-2">
                {game.total_rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400" />
                    {game.total_rating}
                  </div>
                )}
                {game.follows && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-blue-400" />
                    {game.follows.toLocaleString()}
                  </div>
                )}
                {game.popularity_score && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-purple-400" />
                    {game.popularity_score.toLocaleString()}
                  </div>
                )}
              </div>
            )}
            
            {game.flag_reason && (
              <div className="text-yellow-300 text-xs mt-1">
                Reason: {game.flag_reason}
              </div>
            )}
          </div>
        </div>

        <div className="ml-4 space-y-2">
          {!game.greenlight_flag && !game.redlight_flag && (
            <>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for flagging..."
                className="w-48 p-2 text-xs bg-gray-600 border border-gray-500 rounded text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleFlag('greenlight')}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium"
                >
                  ✅ Greenlight
                </button>
                <button
                  onClick={() => handleFlag('redlight')}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium"
                >
                  🚫 Redlight
                </button>
              </div>
            </>
          )}
          
          {(game.greenlight_flag || game.redlight_flag) && (
            <button
              onClick={() => handleFlag('clear')}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs font-medium"
            >
              🏳️ Clear Flag
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Flagged Game Row Component
const FlaggedGameRow: React.FC<{
  game: FlaggedGame;
  onFlag: (gameId: number, flagType: FlagType, reason?: string) => void;
  showConflict?: boolean;
}> = ({ game, onFlag, showConflict = false }) => {
  const getBorderColor = () => {
    if (showConflict && game.conflict_status === 'potential_conflict') {
      return 'border-yellow-500';
    }
    return game.flag_status === 'greenlight' ? 'border-green-500' : 'border-red-500';
  };

  return (
    <div className={`bg-gray-700 p-4 rounded border-l-4 ${getBorderColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {game.flag_status === 'greenlight' && <CheckCircle className="h-4 w-4 text-green-400" />}
            {game.flag_status === 'redlight' && <XCircle className="h-4 w-4 text-red-400" />}
            <h5 className="font-semibold">{game.name}</h5>
            {showConflict && game.conflict_status === 'potential_conflict' && (
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            )}
          </div>
          
          <div className="text-sm text-gray-300 space-y-1">
            <div>Developer: {game.developer || 'Unknown'}</div>
            <div>Publisher: {game.publisher || 'Unknown'}</div>
            <div>Category: {getCategoryLabel(game.category)}</div>
            {game.flag_reason && (
              <div className="text-yellow-300">Reason: {game.flag_reason}</div>
            )}
            <div className="text-xs text-gray-400">
              Flagged by: {game.flagged_by_email || 'Unknown'} on {formatDate(game.flagged_at)}
            </div>
          </div>
        </div>

        <div className="ml-4">
          <button
            onClick={() => onFlag(game.id, 'clear')}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs font-medium"
          >
            🏳️ Clear Flag
          </button>
        </div>
      </div>
    </div>
  );
};

const getCategoryLabel = (category?: number) => {
  const labels: Record<number, string> = {
    0: 'Main game',
    1: 'DLC/Add-on',
    2: 'Expansion',
    3: 'Bundle',
    4: 'Standalone expansion',
    5: 'Mod',
    6: 'Episode',
    7: 'Season',
    8: 'Remake',
    9: 'Remaster',
    10: 'Expanded game',
    11: 'Port',
    12: 'Fork',
    13: 'Pack',
    14: 'Update'
  };
  return category !== undefined ? labels[category] || `Unknown(${category})` : 'Unknown';
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString();
};