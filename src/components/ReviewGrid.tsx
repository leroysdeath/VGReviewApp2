import React, { useState } from 'react';
import { ReviewCard, ReviewData } from './ReviewCard';
import { Filter, Grid, List, Search, Star } from 'lucide-react';

interface ReviewGridProps {
  reviews: ReviewData[];
  showGameTitles?: boolean;
  className?: string;
}

export const ReviewGrid: React.FC<ReviewGridProps> = ({
  reviews,
  showGameTitles = true,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'helpful'>('recent');
  const [filterRating, setFilterRating] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Theme rotation for visual variety
  const themes: Array<'purple' | 'green' | 'orange' | 'blue' | 'red'> = 
    ['purple', 'green', 'orange', 'blue', 'red'];
  
  const getThemeForIndex = (index: number) => themes[index % themes.length];

  // Filter and sort reviews
  const filteredAndSortedReviews = reviews
    .filter(review => {
      const matchesSearch = review.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           review.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (review.gameTitle && review.gameTitle.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRating = filterRating === 0 || review.rating >= filterRating;
      return matchesSearch && matchesRating;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'helpful':
          // In a real app, this would sort by helpfulness score
          return b.rating - a.rating;
        case 'recent':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    })
    .map((review, index) => ({
      ...review,
      theme: getThemeForIndex(index)
    }));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-xl 
                     text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 
                     focus:border-transparent transition-all duration-300"
          />
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Rating Filter */}
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(Number(e.target.value))}
            className="px-4 py-2 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg 
                     text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
          >
            <option value={0}>All Ratings</option>
            <option value={9}>9+ Stars</option>
            <option value={8}>8+ Stars</option>
            <option value={7}>7+ Stars</option>
            <option value={6}>6+ Stars</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'rating' | 'helpful')}
            className="px-4 py-2 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg 
                     text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
          >
            <option value="recent">Most Recent</option>
            <option value="rating">Highest Rated</option>
            <option value="helpful">Most Helpful</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-all duration-300 ${
                viewMode === 'grid' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-all duration-300 ${
                viewMode === 'list' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-gray-400 text-sm">
        Showing {filteredAndSortedReviews.length} of {reviews.length} reviews
        {searchTerm && ` for "${searchTerm}"`}
        {filterRating > 0 && ` with ${filterRating}+ stars`}
      </div>

      {/* Review Grid */}
      <div className={`
        ${viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
        }
      `}>
        {filteredAndSortedReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            compact={viewMode === 'list'}
            showGameTitle={showGameTitles}
            className={viewMode === 'list' ? 'max-w-none' : ''}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedReviews.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-12 h-12 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No reviews found</h3>
          <p className="text-gray-400">
            Try adjusting your search terms or filters to find more reviews.
          </p>
        </div>
      )}
    </div>
  );
};