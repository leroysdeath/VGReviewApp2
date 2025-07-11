import React from 'react';
import { Trophy, Star, Award, Zap } from 'lucide-react';
import { UserLevel } from '../types/gamification';
import { useResponsive } from '../hooks/useResponsive';

interface UserLevelProgressProps {
  userLevel: UserLevel | null;
  progress: number;
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const UserLevelProgress: React.FC<UserLevelProgressProps> = ({
  userLevel,
  progress,
  className = '',
  showDetails = true,
  size = 'md'
}) => {
  const { isMobile } = useResponsive();
  
  if (!userLevel) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
        <div className="h-6 bg-gray-700 rounded mb-4"></div>
        <div className="h-3 bg-gray-700 rounded w-full"></div>
      </div>
    );
  }

  const sizeClasses = {
    sm: {
      container: 'p-3',
      levelBadge: 'w-8 h-8 text-sm',
      levelText: 'text-lg',
      progressHeight: 'h-2'
    },
    md: {
      container: 'p-4',
      levelBadge: 'w-10 h-10 text-base',
      levelText: 'text-xl',
      progressHeight: 'h-3'
    },
    lg: {
      container: 'p-6',
      levelBadge: 'w-12 h-12 text-lg',
      levelText: 'text-2xl',
      progressHeight: 'h-4'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`bg-gray-800 rounded-lg ${classes.container} ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`${classes.levelBadge} bg-game-purple rounded-full flex items-center justify-center text-white font-bold`}>
          {userLevel.level}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`${classes.levelText} font-bold text-white`}>
              Level {userLevel.level}
            </h3>
            
            {showDetails && !isMobile && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <span>Rank: Expert Reviewer</span>
              </div>
            )}
          </div>
          
          {showDetails && (
            <div className="text-sm text-gray-400">
              {userLevel.xp} / {userLevel.xp_to_next_level} XP to next level
            </div>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="relative w-full bg-gray-700 rounded-full overflow-hidden mb-2">
        <div 
          className={`${classes.progressHeight} bg-gradient-to-r from-game-purple to-game-blue rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {showDetails && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-game-purple" />
            <span>{progress}% to Level {userLevel.level + 1}</span>
          </div>
          
          {!isMobile && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-400" />
              <span>Total XP: {userLevel.xp + (userLevel.level - 1) * userLevel.xp_to_next_level}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};