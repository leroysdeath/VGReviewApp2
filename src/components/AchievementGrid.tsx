import React, { useState } from 'react';
import { AchievementWithProgress } from '../types/gamification';
import { AchievementCard } from './AchievementCard';
import { Filter, ChevronDown, Search } from 'lucide-react';

interface AchievementGridProps {
  achievements: AchievementWithProgress[];
  onToggleShowcase?: (achievementId: number, showcase: boolean) => Promise<boolean>;
  className?: string;
}

export const AchievementGrid: React.FC<AchievementGridProps> = ({
  achievements,
  onToggleShowcase,
  className = ''
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Get unique categories
  const categories = ['all', ...new Set(achievements.map(a => a.category))];
  
  // Format category name for display
  const formatCategoryName = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Filter achievements
  const filteredAchievements = achievements.filter(achievement => {
    // Filter by category
    if (filter !== 'all' && achievement.category !== filter) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery && !achievement.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !achievement.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  // Get completion stats
  const completedCount = achievements.filter(a => a.is_completed).length;
  const totalCount = achievements.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100) || 0;
  
  return (
    <div className={className}>
      {/* Header with stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Achievements</h2>
          <p className="text-gray-400">
            {completedCount} of {totalCount} achievements unlocked ({completionPercentage}%)
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filter</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search achievements..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === category
                    ? 'bg-game-purple text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {formatCategoryName(category)}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Progress bar */}
      <div className="mb-6">
        <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-game-purple to-game-blue rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>
      
      {/* Achievements grid */}
      {filteredAchievements.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAchievements.map(achievement => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              onToggleShowcase={onToggleShowcase}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No achievements found</h3>
          <p className="text-gray-400">
            {searchQuery 
              ? `No achievements match "${searchQuery}"`
              : filter !== 'all'
              ? `No achievements in the ${formatCategoryName(filter)} category`
              : 'Try a different filter or search term'
            }
          </p>
        </div>
      )}
    </div>
  );
};