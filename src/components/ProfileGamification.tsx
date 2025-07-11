import React from 'react';
import { Link } from 'react-router-dom';
import { useGamification } from '../hooks/useGamification';
import { UserLevelProgress } from './UserLevelProgress';
import { ProfileAchievements } from './ProfileAchievements';
import { DailyChallenges } from './DailyChallenges';
import { LeaderboardList } from './LeaderboardList';
import { StreakCounter } from './StreakCounter';
import { GamificationNotifications } from './GamificationNotifications';
import { ProfileBadges } from './ProfileBadges';
import { Award, Calendar, Trophy, Zap } from 'lucide-react';

interface ProfileGamificationProps {
  userId: number;
  className?: string;
}

export const ProfileGamification: React.FC<ProfileGamificationProps> = ({
  userId,
  className = ''
}) => {
  const {
    userLevel,
    achievements,
    challenges,
    leaderboards,
    streaks,
    loading,
    notifications,
    claimChallengeReward,
    dismissNotification,
    getLevelProgress
  } = useGamification();
  
  // Get active streaks
  const activeStreaks = streaks.filter(streak => streak.current_streak > 0);
  
  // Check if any data is loading
  const isLoading = Object.values(loading).some(Boolean);
  
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-full"></div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-700 rounded"></div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              <div className="h-24 bg-gray-700 rounded"></div>
              <div className="h-24 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={className}>
      {/* Notifications */}
      <GamificationNotifications
        notifications={notifications}
        onDismiss={dismissNotification}
      />
      
      {/* Level progress */}
      <div className="mb-6">
        <UserLevelProgress
          userLevel={userLevel}
          progress={getLevelProgress()}
          showDetails={true}
          size="md"
        />
      </div>
      
      {/* Badges showcase */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-game-purple" />
            <span>Badges</span>
          </h3>
          
          <Link
            to="/achievements"
            className="text-sm text-game-purple hover:text-game-purple/80 transition-colors"
          >
            View All
          </Link>
        </div>
        
        <ProfileBadges
          achievements={achievements}
          limit={8}
        />
      </div>
      
      {/* Active streaks */}
      {activeStreaks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-game-purple" />
              <span>Active Streaks</span>
            </h3>
          </div>
          
          <div className="space-y-3">
            {activeStreaks.slice(0, 2).map(streak => (
              <StreakCounter
                key={streak.id}
                streak={streak}
                size="sm"
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Main content grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Achievements */}
        <ProfileAchievements
          achievements={achievements}
          limit={4}
        />
        
        {/* Daily challenges */}
        <DailyChallenges
          challenges={challenges}
          onClaimReward={claimChallengeReward}
          limit={2}
        />
      </div>
      
      {/* Leaderboards */}
      <div className="mt-6">
        <LeaderboardList
          leaderboards={leaderboards}
          compact
        />
      </div>
    </div>
  );
};