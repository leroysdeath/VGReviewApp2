import React from 'react';

interface ProfileDataProps {
  stats: {
    gamesReviewed: number;      // Total games the user has reviewed
    thisYearReviews: number;    // Reviews posted in current calendar year
    lists: number;              // Lists created (placeholder - set to 0)
    following: number;          // People this user follows
    followers: number;          // People who follow this user
  };
  className?: string;
}

export const ProfileData: React.FC<ProfileDataProps> = ({ stats, className = '' }) => {
  // Format numbers for display (e.g., 1000 -> 1k)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  return (
    <div className={`flex justify-center ${className}`}>
      <div className="flex gap-8 text-center">
        {/* Games */}
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-white">
            {formatNumber(stats.gamesReviewed)}
          </span>
          <span className="text-sm text-gray-400 uppercase tracking-wide">
            Games
          </span>
        </div>

        {/* This Year */}
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-white">
            {formatNumber(stats.thisYearReviews)}
          </span>
          <span className="text-sm text-gray-400 uppercase tracking-wide">
            This Year
          </span>
        </div>

        {/* Lists (Placeholder) */}
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-white">
            {formatNumber(stats.lists)}
          </span>
          <span className="text-sm text-gray-400 uppercase tracking-wide">
            Lists
          </span>
        </div>

        {/* Following */}
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-white">
            {formatNumber(stats.following)}
          </span>
          <span className="text-sm text-gray-400 uppercase tracking-wide">
            Following
          </span>
        </div>

        {/* Followers */}
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-white">
            {formatNumber(stats.followers)}
          </span>
          <span className="text-sm text-gray-400 uppercase tracking-wide">
            Followers
          </span>
        </div>
      </div>
    </div>
  );
};
