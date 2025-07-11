import React from 'react';
import { UserStreak } from '../types/gamification';
import { Flame, Award, Calendar } from 'lucide-react';

interface StreakCounterProps {
  streak: UserStreak;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StreakCounter: React.FC<StreakCounterProps> = ({
  streak,
  className = '',
  size = 'md'
}) => {
  // Format streak type for display
  const formatStreakType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Get streak color based on length
  const getStreakColor = () => {
    if (streak.current_streak >= 30) return 'text-red-500';
    if (streak.current_streak >= 14) return 'text-orange-500';
    if (streak.current_streak >= 7) return 'text-yellow-500';
    return 'text-gray-400';
  };
  
  // Get streak icon based on type
  const getStreakIcon = () => {
    switch (streak.streak_type) {
      case 'login':
        return <Calendar className="h-4 w-4 text-blue-400" />;
      case 'review':
        return <svg className="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>;
      case 'rating':
        return <svg className="h-4 w-4 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>;
      case 'comment':
        return <svg className="h-4 w-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>;
      default:
        return <Flame className="h-4 w-4 text-orange-400" />;
    }
  };
  
  const sizeClasses = {
    sm: {
      container: 'p-3',
      flameSize: 'w-8 h-8',
      streakText: 'text-lg',
      streakType: 'text-xs'
    },
    md: {
      container: 'p-4',
      flameSize: 'w-10 h-10',
      streakText: 'text-xl',
      streakType: 'text-sm'
    },
    lg: {
      container: 'p-5',
      flameSize: 'w-12 h-12',
      streakText: 'text-2xl',
      streakType: 'text-base'
    }
  };
  
  const classes = sizeClasses[size];
  
  // Check if streak is active today
  const isActiveToday = () => {
    if (!streak.last_activity_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return streak.last_activity_date.split('T')[0] === today;
  };
  
  return (
    <div className={`bg-gray-800 rounded-lg ${classes.container} ${className}`}>
      <div className="flex items-center gap-4">
        {/* Streak flame icon */}
        <div className={`${classes.flameSize} relative flex-shrink-0`}>
          <div className={`absolute inset-0 rounded-full ${getStreakColor()} opacity-20 ${
            isActiveToday() ? 'animate-pulse' : ''
          }`}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Flame className={`h-1/2 w-1/2 ${getStreakColor()}`} />
          </div>
        </div>
        
        <div className="flex-1">
          {/* Streak count */}
          <div className="flex items-center gap-2">
            <span className={`font-bold text-white ${classes.streakText}`}>
              {streak.current_streak} day{streak.current_streak !== 1 ? 's' : ''}
            </span>
            {streak.current_streak >= streak.longest_streak && streak.current_streak > 1 && (
              <span className="bg-game-purple text-white text-xs px-2 py-0.5 rounded-full">
                New Record!
              </span>
            )}
          </div>
          
          {/* Streak type */}
          <div className="flex items-center gap-2 text-gray-400">
            {getStreakIcon()}
            <span className={classes.streakType}>{formatStreakType(streak.streak_type)} Streak</span>
          </div>
        </div>
        
        {/* Longest streak */}
        <div className="text-right">
          <div className="flex items-center gap-1 text-yellow-400 text-sm">
            <Award className="h-4 w-4" />
            <span>Best: {streak.longest_streak}</span>
          </div>
          {isActiveToday() ? (
            <span className="text-green-400 text-xs">Updated today</span>
          ) : (
            <span className="text-red-400 text-xs">Not active today</span>
          )}
        </div>
      </div>
    </div>
  );
};