import React from 'react';
import { 
  Trophy, 
  Star, 
  CheckSquare, 
  Clock, 
  Heart, 
  BarChart2, 
  Calendar,
  Gamepad2
} from 'lucide-react';

export interface UserStats {
  totalGames: number;
  gamesCompleted: number;
  gamesInProgress: number;
  gamesInWishlist: number;
  totalPlaytime: number;
  averageRating: number;
  reviewsWritten: number;
  achievementsUnlocked: number;
  mostPlayedGenre?: string;
  accountAge: number; // in days
}

interface UserStatsPanelProps {
  stats: UserStats;
  className?: string;
}

export const UserStatsPanel: React.FC<UserStatsPanelProps> = ({
  stats,
  className = ''
}) => {
  // Format playtime
  const formatPlaytime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  // Calculate completion rate
  const completionRate = stats.totalGames > 0 
    ? Math.round((stats.gamesCompleted / stats.totalGames) * 100) 
    : 0;

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-700 bg-gray-750">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-purple-400" />
          Gaming Stats
        </h2>
      </div>
      
      <div className="p-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-lg p-4 flex flex-col items-center">
            <Gamepad2 className="h-6 w-6 text-purple-400 mb-2" />
            <div className="text-xl font-bold text-white">{stats.totalGames}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Games</div>
          </div>
          
          <div className="bg-gray-700/50 rounded-lg p-4 flex flex-col items-center">
            <CheckSquare className="h-6 w-6 text-green-400 mb-2" />
            <div className="text-xl font-bold text-white">{stats.gamesCompleted}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Completed</div>
          </div>
          
          <div className="bg-gray-700/50 rounded-lg p-4 flex flex-col items-center">
            <Star className="h-6 w-6 text-yellow-400 mb-2" />
            <div className="text-xl font-bold text-white">{stats.averageRating.toFixed(1)}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Avg Rating</div>
          </div>
          
          <div className="bg-gray-700/50 rounded-lg p-4 flex flex-col items-center">
            <Trophy className="h-6 w-6 text-yellow-500 mb-2" />
            <div className="text-xl font-bold text-white">{stats.achievementsUnlocked}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Achievements</div>
          </div>
        </div>
        
        {/* Detailed Stats */}
        <div className="space-y-4">
          {/* Completion Rate */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-green-400" />
                <span>Completion Rate</span>
              </div>
              <div className="text-sm font-medium text-white">{completionRate}%</div>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
          
          {/* Games In Progress */}
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span>In Progress</span>
            </div>
            <div className="text-sm font-medium text-white">{stats.gamesInProgress}</div>
          </div>
          
          {/* Games In Wishlist */}
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-400" />
              <span>Wishlist</span>
            </div>
            <div className="text-sm font-medium text-white">{stats.gamesInWishlist}</div>
          </div>
          
          {/* Reviews Written */}
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <span>Reviews Written</span>
            </div>
            <div className="text-sm font-medium text-white">{stats.reviewsWritten}</div>
          </div>
          
          {/* Total Playtime */}
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              <span>Total Playtime</span>
            </div>
            <div className="text-sm font-medium text-white">{formatPlaytime(stats.totalPlaytime)}</div>
          </div>
          
          {/* Most Played Genre */}
          {stats.mostPlayedGenre && (
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-green-400" />
                <span>Favorite Genre</span>
              </div>
              <div className="text-sm font-medium text-white">{stats.mostPlayedGenre}</div>
            </div>
          )}
          
          {/* Account Age */}
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              <span>Account Age</span>
            </div>
            <div className="text-sm font-medium text-white">
              {stats.accountAge < 30 
                ? `${stats.accountAge} days` 
                : `${Math.floor(stats.accountAge / 30)} months`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};