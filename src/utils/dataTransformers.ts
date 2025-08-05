// Utility functions to transform data between different formats
import { Game as DatabaseGame, Rating as DatabaseRating, User as DatabaseUser } from '../types/database';

// Transform database game to legacy game format for existing components
export const transformDatabaseGameToLegacy = (dbGame: DatabaseGame) => {
  return {
    id: dbGame.game_id || dbGame.id.toString(), // Use IGDB ID for linking
    title: dbGame.name,
    coverImage: dbGame.pic_url || '/placeholder-game.jpg',
    releaseDate: dbGame.release_date ? dbGame.release_date.toISOString().split('T')[0] : '',
    genre: dbGame.genre || 'Unknown',
    rating: 0, // This would need to be calculated from ratings
    description: dbGame.description || '',
    developer: dbGame.dev || 'Unknown',
    publisher: dbGame.publisher || 'Unknown',
    platforms: dbGame.platforms?.map(p => p.name) || []
  };
};

// Transform database rating to legacy review format
export const transformDatabaseRatingToLegacy = (dbRating: DatabaseRating, dbUser?: DatabaseUser) => {
  return {
    id: dbRating.id.toString(),
    userId: dbRating.user_id.toString(),
    gameId: dbRating.game_id.toString(),
    rating: dbRating.rating,
    text: dbRating.review || '',
    date: dbRating.post_date_time.toLocaleDateString(),
    hasText: !!dbRating.review,
    author: dbUser?.name || dbRating.user?.name || 'Unknown User',
    authorAvatar: dbUser?.picurl || dbRating.user?.picurl || '/placeholder-avatar.jpg'
  };
};

// Transform database user to legacy user format
export const transformDatabaseUserToLegacy = (dbUser: DatabaseUser) => {
  return {
    id: dbUser.id.toString(),
    username: dbUser.name,
    avatar: dbUser.picurl || '/placeholder-avatar.jpg',
    bio: 'Gaming enthusiast', // This would need to be added to the database schema
    joinDate: 'Unknown', // This would need to be added to the database schema
    reviewCount: 0, // This would need to be calculated
    followers: 0, // This would need to be added to the database schema
    following: 0 // This would need to be added to the database schema
  };
};

// Calculate average rating from ratings array
export const calculateAverageRating = (ratings: DatabaseRating[]): number => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
  return sum / ratings.length;
};

// Generate rating distribution for display
export const generateRatingDistribution = (ratings: DatabaseRating[]) => {
  const distribution = Array.from({ length: 10 }, (_, i) => ({
    rating: i + 1,
    count: 0
  }));

  ratings.forEach(rating => {
    const ratingIndex = Math.floor(rating.rating) - 1;
    if (ratingIndex >= 0 && ratingIndex < 10) {
      distribution[ratingIndex].count++;
    }
  });

  return distribution.reverse(); // Show 10 to 1
};

// Format date for display
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Format rating for display (ensure 1 decimal place)
export const formatRating = (rating: number): string => {
  return rating.toFixed(1);
};

// Validate rating value (must be between 1.0 and 10.0)
export const validateRating = (rating: number): boolean => {
  return rating >= 1.0 && rating <= 10.0;
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Generate user stats from ratings
export const generateUserStats = (ratings: DatabaseRating[]) => {
  const totalGames = ratings.length;
  const completedGames = ratings.filter(r => r.finished).length;
  const averageRating = calculateAverageRating(ratings);
  const totalReviews = ratings.filter(r => r.review && r.review.trim().length > 0).length;

  return {
    totalGames,
    completedGames,
    averageRating,
    totalReviews,
    completionRate: totalGames > 0 ? (completedGames / totalGames) * 100 : 0
  };
};
