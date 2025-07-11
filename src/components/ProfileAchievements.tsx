import React from 'react';
import { Link } from 'react-router-dom';
import { AchievementWithProgress } from '../types/gamification';
import { AchievementCard } from './AchievementCard';
import { Award, ArrowRight } from 'lucide-react';

interface ProfileAchievementsProps {
  achievements: AchievementWithProgress[];
  className?: string;
  limit?: number;
}

export const ProfileAchievements: React.FC<ProfileAchievementsProps> = ({
  achievements,
  className = '',
  limit = 4
}) => {
  // Get completed achievements
  const completedAchievements = achievements.filter(a => a.is_completed);
  
  // Get showcased achievements first, then other completed achievements
  const showcasedAchievements = completedAchievements.filter(a => a.is_showcased);
  const otherAchievements = completedAchievements.filter(a => !a.is_showcased);
  
  // Combine showcased first, then others
  const sortedAchievements = [...showcasedAchievements, ...otherAchievements];
  
  // Limit the number of achievements to display
  const displayedAchievements = sortedAchievements.slice(0, limit);
  
  // Calculate stats
  const totalAchievements = achievements.length;
  const completionPercentage = Math.round((completedAchievements.length / totalAchievements) * 100) || 0;
  
  if (completedAchievements.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 text-center ${className}`}>
        <Award className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Achievements Yet</h3>
        <p className="text-gray-400 mb-4">
          Complete challenges and activities to earn achievements
        </p>
        <Link
          to="/achievements"
          className="inline-flex items-center gap-2 px-4 py-2 bg-game-purple text-white rounded-lg hover:bg-game-purple/90 transition-colors"
        >
          <Award className="h-4 w-4" />
          <span>View All Achievements</span>
        </Link>
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-1">Achievements</h3>
          <p className="text-sm text-gray-400">
            {completedAchievements.length} of {totalAchievements} unlocked ({completionPercentage}%)
          </p>
        </div>
        
        <Link
          to="/achievements"
          className="text-game-purple hover:text-game-purple/80 transition-colors flex items-center gap-1"
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {displayedAchievements.map(achievement => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            size="sm"
            showProgress={false}
          />
        ))}
      </div>
      
      {/* Progress bar */}
      <div className="mt-4">
        <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-game-purple to-game-blue rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};