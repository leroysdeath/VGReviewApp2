import React from 'react';
import { Link } from 'react-router-dom';
import { LeaderboardWithEntries } from '../types/gamification';
import { Trophy, Medal, ArrowRight, User } from 'lucide-react';
import { LazyImage } from './LazyImage';

interface LeaderboardCardProps {
  leaderboard: LeaderboardWithEntries;
  className?: string;
  compact?: boolean;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  leaderboard,
  className = '',
  compact = false
}) => {
  // Get medal color for top 3 positions
  const getMedalColor = (position: number) => {
    switch (position) {
      case 1:
        return 'text-yellow-400';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };
  
  // Format leaderboard type for display
  const formatLeaderboardType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Get icon for leaderboard type
  const getLeaderboardIcon = () => {
    switch (leaderboard.leaderboard_type) {
      case 'most_reviews':
        return <svg className="h-5 w-5 text-game-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>;
      case 'highest_rated_reviewer':
        return <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>;
      case 'most_helpful':
        return <svg className="h-5 w-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>;
      case 'most_active':
        return <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>;
      case 'genre_expert':
        return <svg className="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>;
      case 'discovery_leader':
        return <svg className="h-5 w-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>;
      case 'streak_leader':
        return <svg className="h-5 w-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
        </svg>;
      default:
        return <Trophy className="h-5 w-5 text-yellow-400" />;
    }
  };
  
  if (compact) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getLeaderboardIcon()}
            <h3 className="font-semibold text-white">{leaderboard.name}</h3>
          </div>
          
          <Link
            to={`/leaderboards/${leaderboard.id}`}
            className="text-sm text-game-purple hover:text-game-purple/80 transition-colors"
          >
            View All
          </Link>
        </div>
        
        {/* Top 3 users */}
        <div className="space-y-2">
          {leaderboard.entries.slice(0, 3).map((entry, index) => (
            <div key={entry.id} className="flex items-center gap-3 p-2 bg-gray-750 rounded-lg">
              <div className={`w-6 h-6 flex items-center justify-center rounded-full ${getMedalColor(index + 1)} bg-opacity-20`}>
                {index === 0 ? (
                  <Trophy className="h-3 w-3" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {entry.user?.picurl ? (
                  <LazyImage
                    src={entry.user.picurl}
                    alt={entry.user.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="h-3 w-3 text-gray-400" />
                  </div>
                )}
                
                <Link
                  to={`/user/${entry.user_id}`}
                  className="text-white text-sm truncate hover:text-game-purple transition-colors"
                >
                  {entry.user?.name || `User #${entry.user_id}`}
                </Link>
              </div>
              
              <div className="text-sm font-medium text-gray-300">
                {entry.score}
              </div>
            </div>
          ))}
        </div>
        
        {/* User's position */}
        {leaderboard.userRank && (
          <div className="mt-3 p-2 bg-gray-700 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-game-purple bg-opacity-20 rounded-full flex items-center justify-center text-game-purple text-xs font-bold">
                  {leaderboard.userRank}
                </div>
                <span className="text-white text-sm">Your Rank</span>
              </div>
              
              <div className="text-sm font-medium text-gray-300">
                {leaderboard.userScore || 0}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      {/* Leaderboard header */}
      <div className="bg-gray-750 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              {getLeaderboardIcon()}
            </div>
            
            <div>
              <h3 className="font-semibold text-white">{leaderboard.name}</h3>
              <p className="text-sm text-gray-400">{leaderboard.description}</p>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            {formatLeaderboardType(leaderboard.leaderboard_type)}
          </div>
        </div>
      </div>
      
      {/* Leaderboard entries */}
      <div className="p-4">
        <div className="space-y-3">
          {leaderboard.entries.slice(0, 5).map((entry, index) => (
            <div 
              key={entry.id} 
              className={`flex items-center gap-3 p-3 rounded-lg ${
                leaderboard.userRank === index + 1 
                  ? 'bg-game-purple bg-opacity-10 border border-game-purple border-opacity-30' 
                  : 'bg-gray-750'
              }`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-full ${getMedalColor(index + 1)} bg-opacity-20`}>
                {index < 3 ? (
                  <Medal className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-bold">{index + 1}</span>
                )}
              </div>
              
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {entry.user?.picurl ? (
                  <LazyImage
                    src={entry.user.picurl}
                    alt={entry.user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                
                <Link
                  to={`/user/${entry.user_id}`}
                  className="text-white truncate hover:text-game-purple transition-colors"
                >
                  {entry.user?.name || `User #${entry.user_id}`}
                </Link>
              </div>
              
              <div className="text-base font-medium text-gray-300">
                {entry.score}
              </div>
            </div>
          ))}
        </div>
        
        {/* View more link */}
        <div className="mt-4 text-center">
          <Link
            to={`/leaderboards/${leaderboard.id}`}
            className="inline-flex items-center gap-1 text-game-purple hover:text-game-purple/80 transition-colors"
          >
            View Full Leaderboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};