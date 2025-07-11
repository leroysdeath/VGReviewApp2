import React, { useState } from 'react';
import { ChallengeWithProgress } from '../types/gamification';
import { ChallengeCard } from './ChallengeCard';
import { Calendar, Clock } from 'lucide-react';

interface ChallengeListProps {
  challenges: ChallengeWithProgress[];
  onClaimReward?: (challengeId: number) => Promise<boolean>;
  className?: string;
}

export const ChallengeList: React.FC<ChallengeListProps> = ({
  challenges,
  onClaimReward,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'all'>('daily');
  
  // Filter challenges by type
  const filteredChallenges = challenges.filter(challenge => {
    if (activeTab === 'all') return true;
    return challenge.challenge_type === activeTab;
  });
  
  // Sort challenges: active first, then by end date
  const sortedChallenges = [...filteredChallenges].sort((a, b) => {
    // Completed but unclaimed challenges first
    if (a.is_completed && !a.reward_claimed && !(b.is_completed && !b.reward_claimed)) return -1;
    if (b.is_completed && !b.reward_claimed && !(a.is_completed && !a.reward_claimed)) return 1;
    
    // Then active challenges by end date
    if (!a.is_completed && !b.is_completed) {
      return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
    }
    
    // Then by completion status
    if (a.is_completed && !b.is_completed) return 1;
    if (!a.is_completed && b.is_completed) return -1;
    
    // Finally by ID
    return a.id - b.id;
  });
  
  // Get counts for tabs
  const dailyCount = challenges.filter(c => c.challenge_type === 'daily').length;
  const weeklyCount = challenges.filter(c => c.challenge_type === 'weekly').length;
  
  // Get completion stats
  const completedCount = challenges.filter(c => c.is_completed).length;
  const totalCount = challenges.length;
  
  return (
    <div className={className}>
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Challenges</h2>
          <p className="text-gray-400">
            {completedCount} of {totalCount} challenges completed
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="h-4 w-4" />
          <span>Refreshes daily</span>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'daily'
              ? 'border-game-purple text-game-purple'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Daily ({dailyCount})</span>
        </button>
        
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'weekly'
              ? 'border-game-purple text-game-purple'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Weekly ({weeklyCount})</span>
        </button>
        
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'all'
              ? 'border-game-purple text-game-purple'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <span>All ({totalCount})</span>
        </button>
      </div>
      
      {/* Challenge list */}
      {sortedChallenges.length > 0 ? (
        <div className="space-y-4">
          {sortedChallenges.map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onClaimReward={onClaimReward}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
            <Calendar className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No challenges available</h3>
          <p className="text-gray-400">
            {activeTab === 'daily'
              ? 'Check back tomorrow for new daily challenges'
              : activeTab === 'weekly'
              ? 'Check back next week for new weekly challenges'
              : 'No active challenges at the moment'}
          </p>
        </div>
      )}
    </div>
  );
};