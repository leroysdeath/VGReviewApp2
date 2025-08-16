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
}

export const ProfileDetails: React.FC<ProfileDetailsProps> = ({ 
  stats, 
  onFollowersClick, 
  onFollowingClick,
  onGamesClick 
}) => {
  return (
    <div className="flex-shrink-0 flex flex-col gap-4">
      {/* Main Stats */}
      <div className="flex items-center gap-6">
        <button
          onClick={onGamesClick}
          className="text-center hover:bg-gray-700 rounded-lg p-2 transition-colors"
          disabled={!onGamesClick}
        >
          <div className="text-xl font-bold text-white">{stats.films.toLocaleString()}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors">GAMES</div>
        </button>
        <div className="text-center">
          <div className="text-xl font-bold text-white">{stats.thisYear}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">REVIEWS</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-white">{stats.lists}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">LISTS</div>
        </div>
        <button
          onClick={onFollowingClick}
          className="text-center hover:bg-gray-700 rounded-lg p-2 transition-colors"
          disabled={!onFollowingClick}
        >
          <div className="text-xl font-bold text-white">{stats.following}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors">
            FOLLOWING
          </div>
        </button>
        <button
          onClick={onFollowersClick}
          className="text-center hover:bg-gray-700 rounded-lg p-2 transition-colors"
          disabled={!onFollowersClick}
        >
          <div className="text-xl font-bold text-white">{stats.followers.toLocaleString()}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors">
            FOLLOWERS
          </div>
        </button>
      </div>
    </div>
  );
};
