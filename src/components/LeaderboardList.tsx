import React from 'react';
import { LeaderboardWithEntries } from '../types/gamification';
import { LeaderboardCard } from './LeaderboardCard';
import { Trophy } from 'lucide-react';

interface LeaderboardListProps {
  leaderboards: LeaderboardWithEntries[];
  className?: string;
  compact?: boolean;
}

export const LeaderboardList: React.FC<LeaderboardListProps> = ({
  leaderboards,
  className = '',
  compact = false
}) => {
  if (leaderboards.length === 0) {
    return (
      <div className={`text-center py-12 bg-gray-800 rounded-lg ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
          <Trophy className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No leaderboards available</h3>
        <p className="text-gray-400">
          Leaderboards will be available soon
        </p>
      </div>
    );
  }
  
  if (compact) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leaderboards.slice(0, 4).map(leaderboard => (
            <LeaderboardCard
              key={leaderboard.id}
              leaderboard={leaderboard}
              compact
            />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Leaderboards</h2>
        <p className="text-gray-400">
          Compete with other users and climb the ranks
        </p>
      </div>
      
      <div className="space-y-6">
        {leaderboards.map(leaderboard => (
          <LeaderboardCard
            key={leaderboard.id}
            leaderboard={leaderboard}
          />
        ))}
      </div>
    </div>
  );
};