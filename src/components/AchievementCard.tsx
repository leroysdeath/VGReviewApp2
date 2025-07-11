import React, { useState } from 'react';
import { AchievementWithProgress } from '../types/gamification';
import { Lock, Award, Star, Check, Pin } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface AchievementCardProps {
  achievement: AchievementWithProgress;
  onToggleShowcase?: (achievementId: number, showcase: boolean) => Promise<boolean>;
  showProgress?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  onToggleShowcase,
  showProgress = true,
  className = '',
  size = 'md'
}) => {
  const [isShowcasing, setIsShowcasing] = useState(false);
  const { elementRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true
  });
  
  const handleToggleShowcase = async () => {
    if (!onToggleShowcase || !achievement.is_completed) return;
    
    setIsShowcasing(true);
    try {
      await onToggleShowcase(achievement.id, !achievement.is_showcased);
    } finally {
      setIsShowcasing(false);
    }
  };
  
  const sizeClasses = {
    sm: {
      container: 'p-3',
      icon: 'w-10 h-10',
      title: 'text-sm',
      description: 'text-xs'
    },
    md: {
      container: 'p-4',
      icon: 'w-14 h-14',
      title: 'text-base',
      description: 'text-sm'
    },
    lg: {
      container: 'p-5',
      icon: 'w-16 h-16',
      title: 'text-lg',
      description: 'text-base'
    }
  };
  
  const classes = sizeClasses[size];
  
  // Determine if achievement is locked (secret and not completed)
  const isLocked = achievement.is_secret && !achievement.is_completed;
  
  return (
    <div 
      ref={elementRef}
      className={`relative bg-gray-800 rounded-lg ${classes.container} transition-all duration-300 ${
        achievement.is_completed 
          ? 'hover:bg-gray-750 hover:scale-105 hover:shadow-lg' 
          : 'opacity-70'
      } ${className}`}
    >
      {/* Showcase pin */}
      {achievement.is_showcased && (
        <div className="absolute -top-2 -right-2 bg-game-purple text-white p-1 rounded-full z-10">
          <Pin className="h-4 w-4" />
        </div>
      )}
      
      <div className="flex flex-col items-center text-center">
        {/* Achievement icon */}
        <div 
          className={`${classes.icon} rounded-full mb-3 flex items-center justify-center ${
            achievement.is_completed 
              ? `bg-opacity-20 bg-${achievement.badge_color}`
              : 'bg-gray-700'
          }`}
          style={{ backgroundColor: achievement.is_completed ? `${achievement.badge_color}20` : undefined }}
        >
          {achievement.icon_url && !isLocked ? (
            <LazyImage
              src={achievement.icon_url}
              alt={achievement.name}
              className="w-3/4 h-3/4 object-contain"
            />
          ) : isLocked ? (
            <Lock className="h-1/2 w-1/2 text-gray-500" />
          ) : (
            <Award className="h-1/2 w-1/2" style={{ color: achievement.badge_color }} />
          )}
          
          {achievement.is_completed && (
            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full">
              <Check className="h-3 w-3" />
            </div>
          )}
        </div>
        
        {/* Achievement title */}
        <h3 className={`font-semibold text-white mb-1 ${classes.title}`}>
          {isLocked ? 'Secret Achievement' : achievement.name}
        </h3>
        
        {/* Achievement description */}
        <p className={`text-gray-400 mb-3 ${classes.description}`}>
          {isLocked ? 'Complete to unlock details' : achievement.description}
        </p>
        
        {/* XP reward */}
        <div className="flex items-center gap-1 text-xs text-yellow-400 mb-2">
          <Star className="h-3 w-3" />
          <span>{achievement.xp_reward} XP</span>
        </div>
        
        {/* Progress bar */}
        {showProgress && achievement.requirement_count && !isLocked && (
          <div className="w-full mt-2">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{achievement.progress} / {achievement.requirement_count}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  achievement.is_completed ? 'bg-green-500' : 'bg-game-purple'
                }`}
                style={{ 
                  width: `${Math.min(100, (achievement.progress / achievement.requirement_count) * 100)}%`,
                  transition: isIntersecting ? 'width 1s ease-out' : 'none'
                }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Showcase button */}
        {achievement.is_completed && onToggleShowcase && (
          <button
            onClick={handleToggleShowcase}
            disabled={isShowcasing}
            className={`mt-3 px-3 py-1 rounded text-xs font-medium transition-colors ${
              achievement.is_showcased
                ? 'bg-game-purple text-white hover:bg-game-purple/80'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${isShowcasing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {achievement.is_showcased ? 'Showcased' : 'Showcase'}
          </button>
        )}
        
        {/* Completion date */}
        {achievement.is_completed && achievement.completed_at && (
          <div className="text-xs text-gray-500 mt-2">
            Earned on {new Date(achievement.completed_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};