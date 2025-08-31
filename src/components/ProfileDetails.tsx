import React from 'react';

interface ProfileDetailsProps {
  stats: {
    films: number;
    thisYear: number;
    lists: number;
    following: number;
    followers: number;
  };
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  onGamesClick?: () => void;
  onReviewsClick?: () => void;
}

export const ProfileDetails: React.FC<ProfileDetailsProps> = ({ 
  stats, 
  onFollowersClick, 
  onFollowingClick,
  onGamesClick,
  onReviewsClick 
}) => {
  return (
    <div className="flex-shrink-0 flex flex-col gap-4">
      {/* Main Stats */}
      <div className="grid grid-cols-5 gap-2 sm:gap-4 md:gap-6 w-full sm:w-auto">
        <button
          onClick={onGamesClick}
          className="flex flex-col items-center justify-center hover:bg-gray-700 rounded-lg p-2 transition-colors min-w-0"
          disabled={!onGamesClick}
        >
          <div className="text-lg sm:text-xl font-bold text-white">{stats.films.toLocaleString()}</div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors text-center">GAMES</div>
        </button>
        <button
          onClick={onReviewsClick}
          className="flex flex-col items-center justify-center hover:bg-gray-700 rounded-lg p-2 transition-colors min-w-0"
          disabled={!onReviewsClick}
        >
          <div className="text-lg sm:text-xl font-bold text-white">{stats.thisYear}</div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors text-center">REVIEWS</div>
        </button>
        <div className="flex flex-col items-center justify-center p-2 min-w-0">
          <div className="text-lg sm:text-xl font-bold text-white">{stats.lists}</div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide text-center">LISTS</div>
        </div>
        <button
          onClick={onFollowingClick}
          className="flex flex-col items-center justify-center hover:bg-gray-700 rounded-lg p-2 transition-colors min-w-0"
          disabled={!onFollowingClick}
        >
          <div className="text-lg sm:text-xl font-bold text-white">{stats.following}</div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors text-center">
            FOLLOWING
          </div>
        </button>
        <button
          onClick={onFollowersClick}
          className="flex flex-col items-center justify-center hover:bg-gray-700 rounded-lg p-2 transition-colors min-w-0"
          disabled={!onFollowersClick}
        >
          <div className="text-lg sm:text-xl font-bold text-white">{stats.followers.toLocaleString()}</div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors text-center">
            FOLLOWERS
          </div>
        </button>
      </div>
    </div>
  );
};
