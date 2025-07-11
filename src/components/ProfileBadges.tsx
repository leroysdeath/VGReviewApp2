import React from 'react';
import { AchievementWithProgress } from '../types/gamification';
import { LazyImage } from './LazyImage';
import { Award } from 'lucide-react';

interface ProfileBadgesProps {
  achievements: AchievementWithProgress[];
  limit?: number;
  showAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

export const ProfileBadges: React.FC<ProfileBadgesProps> = ({
  achievements,
  limit = 5,
  showAll = false,
  onViewAll,
  className = ''
}) => {
  // Get completed achievements
  const completedAchievements = achievements.filter(a => a.is_completed);
  
  // Get showcased achievements first, then other completed achievements
  const showcasedAchievements = completedAchievements.filter(a => a.is_showcased);
  const otherAchievements = completedAchievements.filter(a => !a.is_showcased);
  
  // Combine showcased first, then others
  const sortedAchievements = [...showcasedAchievements, ...otherAchievements];
  
  // Limit the number of achievements to display
  const displayedAchievements = showAll 
    ? sortedAchievements 
    : sortedAchievements.slice(0, limit);
  
  // Calculate remaining count
  const remainingCount = sortedAchievements.length - displayedAchievements.length;
  
  if (completedAchievements.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 text-center ${className}`}>
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-700 rounded-full flex items-center justify-center">
          <Award className="h-6 w-6 text-gray-500" />
        </div>
        <h3 className="text-white font-medium mb-1">No Achievements Yet</h3>
        <p className="text-gray-400 text-sm">
          Complete challenges to earn badges
        </p>
      </div>
    );
  }
  
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 justify-center">
        {displayedAchievements.map(achievement => (
          <div 
            key={achievement.id}
            className={`relative group ${achievement.is_showcased ? 'ring-2 ring-game-purple' : ''}`}
          >
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${achievement.badge_color}20` }}
              title={achievement.name}
            >
              {achievement.icon_url ? (
                <LazyImage
                  src={achievement.icon_url}
                  alt={achievement.name}
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <Award className="h-6 w-6" style={{ color: achievement.badge_color }} />
              )}
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10 pointer-events-none">
              <div className="font-medium mb-1">{achievement.name}</div>
              <div className="text-gray-300">{achievement.description}</div>
              {achievement.is_showcased && (
                <div className="mt-1 text-game-purple text-xs">Showcased</div>
              )}
              
              {/* Arrow */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          </div>
        ))}
        
        {/* Remaining count */}
        {remainingCount > 0 && (
          <button
            onClick={onViewAll}
            className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-white font-medium hover:bg-gray-600 transition-colors"
            title="View all achievements"
          >
            +{remainingCount}
          </button>
        )}
      </div>
    </div>
  );
};