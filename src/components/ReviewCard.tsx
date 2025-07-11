import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';

// TypeScript interface for review data
export interface ReviewData {
  id: string;
  userId: string;
  gameId: string;
  username: string;
  userAvatar?: string;
  gameTitle: string;
  rating: number;
  reviewText: string;
  date: string;
  likes?: number;
  dislikes?: number;
  comments?: number;
  theme?: 'purple' | 'green' | 'blue' | 'orange';
}

interface ReviewCardProps {
  review: ReviewData;
  compact?: boolean;
  className?: string;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ 
  review, 
  compact = false, 
  className = '' 
}) => {
  // Get theme color
  const getThemeColor = () => {
    switch (review.theme) {
      case 'green': return 'border-green-500 group-hover:border-green-400';
      case 'blue': return 'border-blue-500 group-hover:border-blue-400';
      case 'orange': return 'border-orange-500 group-hover:border-orange-400';
      default: return 'border-purple-500 group-hover:border-purple-400';
    }
  };

  // Get user initial for avatar fallback
  const getUserInitial = () => {
    return review.username.charAt(0).toUpperCase();
  };

  // Get avatar gradient background
  const getAvatarGradient = () => {
    switch (review.theme) {
      case 'green': return 'bg-gradient-to-br from-green-500 to-emerald-700';
      case 'blue': return 'bg-gradient-to-br from-blue-500 to-indigo-700';
      case 'orange': return 'bg-gradient-to-br from-orange-500 to-amber-700';
      default: return 'bg-gradient-to-br from-purple-500 to-indigo-700';
    }
  };

  // Render stars based on rating (out of 10, displayed as 5 stars)
  const renderStars = () => {
    const starCount = 5;
    const normalizedRating = review.rating / 2; // Convert 10-scale to 5-scale
    
    return Array.from({ length: starCount }).map((_, index) => {
      const isFilled = index < Math.floor(normalizedRating);
      const isHalf = !isFilled && index < Math.floor(normalizedRating + 0.5);
      
      return (
        <Star 
          key={index}
          className={`h-4 w-4 ${
            isFilled || isHalf ? 'text-yellow-400' : 'text-gray-600'
          } ${isFilled ? 'fill-current' : isHalf ? 'fill-[url(#half)]' : ''}`}
        />
      );
    });
  };

  // Compact card layout
  if (compact) {
    return (
      <div 
        className={`group bg-gray-800/80 backdrop-blur-sm border border-gray-700 hover:bg-gray-750/80 rounded-lg p-4 transition-all duration-300 ${getThemeColor()} ${className}`}
      >
        <div className="flex gap-3">
          {/* User Avatar */}
          <Link to={`/user/${review.userId}`} className="flex-shrink-0">
            {review.userAvatar ? (
              <img 
                src={review.userAvatar} 
                alt={review.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getAvatarGradient()}`}>
                {getUserInitial()}
              </div>
            )}
          </Link>
          
          {/* Review Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link 
                to={`/user/${review.userId}`}
                className="font-medium text-white hover:text-game-purple transition-colors"
              >
                {review.username}
              </Link>
              <span className="text-gray-400 text-sm">•</span>
              <Link 
                to={`/game/${review.gameId}`}
                className="text-gray-300 hover:text-game-purple transition-colors line-clamp-1"
              >
                {review.gameTitle}
              </Link>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center">
                {renderStars()}
              </div>
              <span className="text-white font-medium">{review.rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">{review.date}</span>
            </div>
            
            <p className="text-gray-300 text-sm line-clamp-2">{review.reviewText}</p>
          </div>
        </div>
      </div>
    );
  }

  // Full card layout
  return (
    <div 
      className={`group bg-gray-800/80 backdrop-blur-sm border border-gray-700 hover:bg-gray-750/80 rounded-lg p-6 transition-all duration-300 ${getThemeColor()} ${className}`}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* User Avatar */}
        <div className="flex sm:flex-col items-center sm:items-start gap-3">
          <Link to={`/user/${review.userId}`} className="flex-shrink-0">
            {review.userAvatar ? (
              <img 
                src={review.userAvatar} 
                alt={review.username}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover"
              />
            ) : (
              <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white text-xl font-medium ${getAvatarGradient()}`}>
                {getUserInitial()}
              </div>
            )}
          </Link>
          
          <div className="sm:mt-2 text-center sm:text-left">
            <Link 
              to={`/user/${review.userId}`}
              className="font-medium text-white hover:text-game-purple transition-colors"
            >
              {review.username}
            </Link>
            <div className="text-xs text-gray-400 mt-1">{review.date}</div>
          </div>
        </div>
        
        {/* Review Content */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <Link 
              to={`/game/${review.gameId}`}
              className="text-xl font-bold text-white hover:text-game-purple transition-colors"
            >
              {review.gameTitle}
            </Link>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {renderStars()}
              </div>
              <span className="text-white font-medium">{review.rating.toFixed(1)}/10</span>
            </div>
          </div>
          
          <p className="text-gray-300 leading-relaxed mb-4">{review.reviewText}</p>
          
          {/* Interaction Buttons */}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <button className="flex items-center gap-1 hover:text-green-400 transition-colors">
              <ThumbsUp className="h-4 w-4" />
              <span>{review.likes || 0}</span>
            </button>
            
            <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
              <ThumbsDown className="h-4 w-4" />
              <span>{review.dislikes || 0}</span>
            </button>
            
            <button className="flex items-center gap-1 hover:text-game-purple transition-colors">
              <MessageCircle className="h-4 w-4" />
              <span>Reply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Example usage
export const ReviewCardExample: React.FC = () => {
  const exampleReview: ReviewData = {
    id: '1',
    userId: 'user1',
    gameId: 'game1',
    username: 'GameMaster92',
    userAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    gameTitle: 'The Witcher 3: Wild Hunt',
    rating: 9.5,
    reviewText: 'An absolute masterpiece. The world-building is phenomenal, characters are deep and complex, and the side quests are better than most games\' main stories. Geralt\'s journey is both personal and epic in scope.',
    date: '2 days ago',
    likes: 42,
    dislikes: 3,
    comments: 7,
    theme: 'purple'
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900">
      <h2 className="text-2xl font-bold text-white mb-4">Review Card Examples</h2>
      
      <div className="space-y-6">
        <ReviewCard review={exampleReview} />
        <ReviewCard review={{...exampleReview, theme: 'green'}} compact />
      </div>
    </div>
  );
};