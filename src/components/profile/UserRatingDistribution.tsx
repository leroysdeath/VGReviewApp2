import React, { useState, useEffect } from 'react';
import { RatingBars } from '../RatingBars';
import { getUserRatingDistribution } from '../../services/userService';

interface UserRatingDistributionProps {
  userId: number;
  username?: string;
  className?: string;
  onBarClick?: (rating: number) => void;
  isOwnProfile?: boolean;
}

export const UserRatingDistribution: React.FC<UserRatingDistributionProps> = ({
  userId,
  username,
  className = '',
  onBarClick,
  isOwnProfile = false
}) => {
  const [distribution, setDistribution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDistribution();
  }, [userId]);

  const loadDistribution = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getUserRatingDistribution(userId);

      if (result.success && result.data) {
        setDistribution(result.data);
      } else {
        setError(result.error || 'Failed to load rating distribution');
      }
    } catch (err) {
      console.error('Error loading rating distribution:', err);
      setError('Failed to load rating distribution');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-gray-900/80 to-gray-800/70 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-32 mb-4"></div>
          <div className="flex gap-[2px] justify-center" style={{ height: '80px' }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-6 bg-gray-700 rounded-sm"
                style={{ height: '2px' }}
              ></div>
            ))}
          </div>
          <div className="h-3 bg-gray-700 rounded w-24 mx-auto mt-3"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-gradient-to-br from-gray-900/80 to-gray-800/70 rounded-lg p-6 ${className}`}>
        <div className="mb-2 text-center">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            {username ? `${username}'s Ratings` : 'Ratings'}
          </h3>
        </div>
        <div className="border-b border-gray-700 mb-4"></div>
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  // No data or empty state
  if (!distribution || distribution.totalRatings === 0) {
    return (
      <div className={`bg-gradient-to-br from-gray-900/80 to-gray-800/70 rounded-lg p-6 ${className}`}>
        <div className="mb-2 text-center">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            {username ? `${username}'s Ratings` : 'Ratings'}
          </h3>
        </div>
        <div className="border-b border-gray-700 mb-4"></div>
        <div className="text-center py-8">
          <p className="text-gray-400">
            {isOwnProfile
              ? "No ratings yet. Start rating games to see your distribution!"
              : "No ratings yet"}
          </p>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className={`bg-gradient-to-br from-gray-900/80 to-gray-800/70 rounded-lg p-6 ${className}`}>
      <div className="mb-2">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          {username ? `${username}'s Ratings` : 'Ratings'}
        </h3>
      </div>
      <div className="border-b border-gray-700 mb-4"></div>
      <RatingBars
        distribution={distribution.distribution}
        totalRatings={distribution.totalRatings}
        averageRating={distribution.averageRating}
        barHeight={60}
        showLabels={true}
        interactive={!!onBarClick}
        onBarClick={onBarClick}
        showTotalRatings={false}
      />
      <p className="text-gray-400 text-sm text-center mt-3">
        Based on {distribution.totalRatings} {distribution.totalRatings === 1 ? 'review' : 'reviews'}
      </p>
    </div>
  );
};