import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ThumbsUp, MessageCircle, Calendar } from 'lucide-react';
import { ReviewData } from './ReviewCard';

interface ReviewCardFeaturedProps {
  review: ReviewData;
  className?: string;
}

export const ReviewCardFeatured: React.FC<ReviewCardFeaturedProps> = ({ 
  review, 
  className = '' 
}) => {
  // Get theme color
  const getThemeColor = () => {
    switch (review.theme) {
      case 'green': return 'from-green-500/20 to-emerald-700/20';
      case 'blue': return 'from-blue-500/20 to-indigo-700/20';
      case 'orange': return 'from-orange-500/20 to-amber-700/20';
      default: return 'from-purple-500/20 to-indigo-700/20';
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

  // Format rating to one decimal place
  const formattedRating = review.rating.toFixed(1);

  return (
    <div 
      className={`relative overflow-hidden rounded-xl bg-gray-800/90 backdrop-blur-sm border border-gray-700 hover:border-gray-500 transition-all duration-300 ${className}`}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getThemeColor()} opacity-30`}></div>
      
      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* User info */}
          <div className="flex md:flex-col items-center md:items-center gap-4">
            <Link to={`/user/${review.userId}`} className="flex-shrink-0">
              {review.userAvatar ? (
                <img 
                  src={review.userAvatar} 
                  alt={review.username}
                  className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover border-2 border-gray-700"
                />
              ) : (
                <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white text-2xl font-medium border-2 border-gray-700 ${getAvatarGradient()}`}>
                  {getUserInitial()}
                </div>
              )}
            
              <div className="hidden md:block text-center mt-3">
                <div className="font-medium text-white">{review.username}</div>
                <div className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{review.date}</span>
                </div>
              </div>
            </Link>
            
            <div className="md:hidden">
              <Link 
                to={`/user/${review.userId}`}
                className="font-medium text-white hover:text-game-purple transition-colors"
              >
                {review.username}
              </Link>
              <div className="text-xs text-gray-400 mt-1">{review.date}</div>
            </div>
          </div>
          
          {/* Review content */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <Link 
                to={`/game/${review.gameId}`}
                className="text-2xl font-bold text-white hover:text-game-purple transition-colors"
              >
                {review.gameTitle}
              </Link>
              
              <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full self-start">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const normalizedRating = review.rating / 2; // Convert 10-scale to 5-scale
                    const isFilled = index < Math.floor(normalizedRating);
                    const isHalf = !isFilled && index < Math.floor(normalizedRating + 0.5);
                    
                    return (
                      <Star 
                        key={index}
                        className={`h-4 w-4 ${
                          isFilled || isHalf ? 'text-yellow-400' : 'text-gray-600'
                        } ${isFilled ? 'fill-current' : ''}`}
                      />
                    );
                  })}
                </div>
                <span className="text-white font-medium">{formattedRating}/10</span>
              </div>
            </div>
            
            <blockquote className="text-gray-300 text-lg leading-relaxed mb-6 italic">
              "{review.reviewText}"
            </blockquote>
            
            {/* Interaction buttons */}
            <div className="flex items-center gap-6">
              <button className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors">
                <ThumbsUp className="h-5 w-5" />
                <span>{review.likes || 0}</span>
              </button>
              
              <button className="flex items-center gap-2 text-gray-400 hover:text-game-purple transition-colors">
                <MessageCircle className="h-5 w-5" />
                <span>Reply</span>
              </button>
              
              <Link 
                to={`/review/${review.id}`}
                className="ml-auto text-game-purple hover:text-game-purple/80 transition-colors"
              >
                Read full review
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};