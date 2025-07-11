import React, { useState } from 'react';
import { ChallengeWithProgress } from '../types/gamification';
import { Calendar, Clock, Star, Award, Zap, CheckCircle } from 'lucide-react';
import { LazyImage } from './LazyImage';

interface ChallengeCardProps {
  challenge: ChallengeWithProgress;
  onClaimReward?: (challengeId: number) => Promise<boolean>;
  className?: string;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  onClaimReward,
  className = ''
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  
  const handleClaimReward = async () => {
    if (!onClaimReward || !challenge.is_completed || challenge.reward_claimed) return;
    
    setIsClaiming(true);
    try {
      await onClaimReward(challenge.id);
    } finally {
      setIsClaiming(false);
    }
  };
  
  // Determine challenge type color
  const getTypeColor = () => {
    switch (challenge.challenge_type) {
      case 'daily':
        return 'bg-blue-500';
      case 'weekly':
        return 'bg-purple-500';
      case 'monthly':
        return 'bg-green-500';
      case 'special':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Format challenge type for display
  const formatChallengeType = () => {
    return challenge.challenge_type.charAt(0).toUpperCase() + challenge.challenge_type.slice(1);
  };
  
  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      {/* Challenge header */}
      <div className={`px-4 py-2 ${getTypeColor()} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-white" />
          <span className="text-white text-sm font-medium">{formatChallengeType()} Challenge</span>
        </div>
        
        <div className="flex items-center gap-2 text-white text-xs">
          <Clock className="h-3 w-3" />
          <span>{challenge.timeRemaining}</span>
        </div>
      </div>
      
      {/* Challenge content */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* Challenge icon */}
          <div className="flex-shrink-0">
            {challenge.icon_url ? (
              <LazyImage
                src={challenge.icon_url}
                alt={challenge.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                <Award className="h-6 w-6 text-game-purple" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            {/* Challenge title and description */}
            <h3 className="font-semibold text-white mb-1">{challenge.name}</h3>
            <p className="text-gray-400 text-sm mb-3">{challenge.description}</p>
            
            {/* XP reward */}
            <div className="flex items-center gap-1 text-yellow-400 text-sm mb-3">
              <Star className="h-4 w-4" />
              <span>{challenge.xp_reward} XP</span>
            </div>
            
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
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Reward Claimed</span>
                </div>
              ) : (
                <button
                  onClick={handleClaimReward}
                  disabled={isClaiming}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-game-purple text-white rounded-lg hover:bg-game-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClaiming ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Claiming...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      <span>Claim Reward</span>
                    </>
                  )}
                </button>
              )
            ) : (
              <div className="text-sm text-gray-400">
                Complete this challenge to earn {challenge.xp_reward} XP!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};