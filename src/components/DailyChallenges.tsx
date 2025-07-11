import React from 'react';
import { Link } from 'react-router-dom';
import { ChallengeWithProgress } from '../types/gamification';
import { Calendar, ArrowRight, Clock } from 'lucide-react';

interface DailyChallengesProps {
  challenges: ChallengeWithProgress[];
  onClaimReward?: (challengeId: number) => Promise<boolean>;
  className?: string;
  limit?: number;
}

export const DailyChallenges: React.FC<DailyChallengesProps> = ({
  challenges,
  onClaimReward,
  className = '',
  limit = 3
}) => {
  // Filter daily challenges
  const dailyChallenges = challenges.filter(c => c.challenge_type === 'daily');
  
  // Sort challenges: active first, then by end date
  const sortedChallenges = [...dailyChallenges].sort((a, b) => {
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
  
  // Limit the number of challenges to display
  const displayedChallenges = sortedChallenges.slice(0, limit);
  
  if (dailyChallenges.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 text-center ${className}`}>
        <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Daily Challenges</h3>
        <p className="text-gray-400 mb-4">
          Check back tomorrow for new challenges
        </p>
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-1">Daily Challenges</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            <span>Refreshes in 12 hours</span>
          </div>
        </div>
        
        <Link
          to="/challenges"
          className="text-game-purple hover:text-game-purple/80 transition-colors flex items-center gap-1"
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      
      <div className="space-y-4">
        {displayedChallenges.map(challenge => (
          <div key={challenge.id} className="bg-gray-750 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium text-white mb-1">{challenge.name}</h4>
                <p className="text-gray-400 text-sm mb-3">{challenge.description}</p>
                
                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{challenge.progress} / {challenge.requirement_count}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        challenge.is_completed ? 'bg-green-500' : 'bg-game-purple'
                      }`}
                      style={{ width: `${challenge.percentComplete}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Claim button or status */}
                {challenge.is_completed ? (
                  challenge.reward_claimed ? (
                    <div className="text-green-400 text-sm">
                      Completed! +{challenge.xp_reward} XP earned
                    </div>
                  ) : (
                    <button
                      onClick={() => onClaimReward?.(challenge.id)}
                      className="px-4 py-2 bg-game-purple text-white text-sm rounded-lg hover:bg-game-purple/90 transition-colors"
                    >
                      Claim {challenge.xp_reward} XP
                    </button>
                  )
                ) : (
                  <div className="text-sm text-gray-400">
                    Complete to earn {challenge.xp_reward} XP
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};