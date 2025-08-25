// Utility functions to transform data between different formats
import { Game as DatabaseGame, Rating as DatabaseRating, User as DatabaseUser } from '../types/database';

// Transform database game to legacy game format for existing components
export const transformDatabaseGameToLegacy = (dbGame: DatabaseGame) => {
  return {
    id: dbGame.id.toString(),
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
    authorAvatar: dbUser?.avatar_url || dbRating.user?.avatar_url || '/placeholder-avatar.jpg'
  };
};

// Transform database user to legacy user format
export const transformDatabaseUserToLegacy = (dbUser: DatabaseUser) => {
  return {
    id: dbUser.id.toString(),
    username: dbUser.name,
    avatar: dbUser.avatar_url || '/placeholder-avatar.jpg',
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
// Groups ratings by whole number (1.0-1.9 -> 1, 2.0-2.9 -> 2, etc)
// Returns distribution with count and percentage for each rating segment
// Accepts any array of objects with a rating property
export const generateRatingDistribution = (ratings: Array<{ rating: number }>) => {
  // Initialize distribution with all rating segments 1-10
  const distribution = Array.from({ length: 10 }, (_, i) => ({
    rating: i + 1, // Start from 1 up to 10
    count: 0,
    percentage: 0
  }));

  // Count ratings for each segment
  ratings.forEach(rating => {
    // Group ratings by floor value (1.0-1.9 -> 1, 2.0-2.9 -> 2, etc)
    // Special case: 10.0 is its own segment (no 10.5 exists)
    let ratingSegment = Math.floor(rating.rating);
    
    // Ensure rating segment is within valid range (1-10)
    if (ratingSegment >= 1 && ratingSegment <= 10) {
      // Find the index in our distribution array (which goes 1 to 10)
      const index = ratingSegment - 1;
      distribution[index].count++;
    }
  });

  // Calculate percentages
  const totalRatings = ratings.length;
  if (totalRatings > 0) {
    distribution.forEach(segment => {
      segment.percentage = (segment.count / totalRatings) * 100;
    });
  }

  return distribution; // Now in ascending order (1 to 10)
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