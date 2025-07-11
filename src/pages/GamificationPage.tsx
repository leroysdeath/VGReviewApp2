import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useGamification } from '../hooks/useGamification';
import { UserLevelProgress } from '../components/UserLevelProgress';
import { AchievementGrid } from '../components/AchievementGrid';
import { ChallengeList } from '../components/ChallengeList';
import { LeaderboardList } from '../components/LeaderboardList';
import { StreakCounter } from '../components/StreakCounter';
import { GamificationNotifications } from '../components/GamificationNotifications';
import { Trophy, Award, Calendar, Medal, RefreshCw, Flame } from 'lucide-react';

export const GamificationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'achievements' | 'challenges' | 'leaderboards'>('achievements');
  
  const {
    userLevel,
    achievements,
    challenges,
    leaderboards,
    streaks,
    loading,
    notifications,
    loadAllData,
    claimChallengeReward,
    toggleShowcaseAchievement,
    dismissNotification,
    getLevelProgress
  } = useGamification();
  
  // Get active streaks
  const activeStreaks = streaks.filter(streak => streak.current_streak > 0);
  
  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <Helmet>
        <title>Achievements & Challenges | GameVault</title>
        <meta name="description" content="Track your achievements, complete challenges, and climb the leaderboards" />
      </Helmet>
      
      {/* Notifications */}
      <GamificationNotifications
        notifications={notifications}
        onDismiss={dismissNotification}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Achievements & Challenges</h1>
          
          <button
            onClick={loadAllData}
            disabled={Object.values(loading).some(Boolean)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${Object.values(loading).some(Boolean) ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        
        {/* User level and streaks */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <UserLevelProgress
              userLevel={userLevel}
              progress={getLevelProgress()}
              showDetails={true}
              size="lg"
            />
          </div>
          
          <div className="space-y-4">
            {activeStreaks.length > 0 ? (
              activeStreaks.map(streak => (
                <StreakCounter
                  key={streak.id}
                  streak={streak}
                />
              ))
            ) : (
              <div className="bg-gray-800 rounded-lg p-4 text-center h-full flex flex-col items-center justify-center">
                <Flame className="h-8 w-8 text-gray-600 mb-3" />
                <h3 className="text-white font-medium mb-1">No Active Streaks</h3>
                <p className="text-gray-400 text-sm">
                  Start a streak by logging in daily
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg overflow-hidden mb-8">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('achievements')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'achievements'
                  ? 'bg-gray-750 text-white border-b-2 border-game-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-750'
              }`}
            >
              <Award className="h-5 w-5" />
              <span>Achievements</span>
            </button>
            
            <button
              onClick={() => setActiveTab('challenges')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'challenges'
                  ? 'bg-gray-750 text-white border-b-2 border-game-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-750'
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span>Challenges</span>
            </button>
            
            <button
              onClick={() => setActiveTab('leaderboards')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'leaderboards'
                  ? 'bg-gray-750 text-white border-b-2 border-game-purple'
                  : 'text-gray-400 hover:text-white hover:bg-gray-750'
              }`}
            >
              <Trophy className="h-5 w-5" />
              <span>Leaderboards</span>
            </button>
          </div>
          
          <div className="p-6">
            {/* Achievements tab */}
            {activeTab === 'achievements' && (
              <AchievementGrid
                achievements={achievements}
                onToggleShowcase={toggleShowcaseAchievement}
              />
            )}
            
            {/* Challenges tab */}
            {activeTab === 'challenges' && (
              <ChallengeList
                challenges={challenges}
                onClaimReward={claimChallengeReward}
              />
            )}
            
            {/* Leaderboards tab */}
            {activeTab === 'leaderboards' && (
              <LeaderboardList
                leaderboards={leaderboards}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};