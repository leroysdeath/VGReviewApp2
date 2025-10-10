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
          className="group relative flex flex-col items-center justify-center rounded-lg p-2 transition-all min-w-0 overflow-hidden"
          disabled={!onGamesClick}
        >
          {/* Split border for Games */}
          <div className="absolute inset-0 rounded-lg opacity-100 md:opacity-60" style={{
            background: 'linear-gradient(90deg, #3b82f6 50%, #10b981 50%)'
          }}>
            <div className="absolute inset-0 rounded-lg p-[1px]">
              <div className="w-full h-full bg-gray-900 rounded-lg"></div>
            </div>
          </div>
          <div className="absolute inset-0 flex opacity-0 group-hover:opacity-10 transition-opacity rounded-lg">
            <div className="w-1/2 bg-blue-600"></div>
            <div className="w-1/2 bg-green-600"></div>
          </div>
          <div className="relative text-lg sm:text-xl font-bold text-white transition-colors group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-green-400 group-hover:bg-clip-text group-hover:text-transparent">{stats.films.toLocaleString()}</div>
          <div className="relative text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide transition-colors text-center group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-green-400 group-hover:bg-clip-text group-hover:text-transparent">GAMES</div>
        </button>
        <button
          onClick={onReviewsClick}
          className="group flex flex-col items-center justify-center border border-purple-500 md:border-opacity-60 hover:bg-purple-600/10 rounded-lg p-2 transition-all min-w-0"
          disabled={!onReviewsClick}
        >
          <div className="text-lg sm:text-xl font-bold text-white group-hover:text-purple-400 transition-colors">{stats.thisYear}</div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide group-hover:text-purple-400 transition-colors text-center">REVIEWS</div>
        </button>
        <div className="group relative flex flex-col items-center justify-center p-2 min-w-0">
          <div className="text-lg sm:text-xl font-bold text-white">{stats.lists}</div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide text-center">LISTS</div>
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 hidden group-hover:block group-active:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
            Coming soon
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
        <button
          onClick={onFollowingClick}
          className="group flex flex-col items-center justify-center border border-[#E8A5A5] md:border-opacity-60 hover:bg-[#E8A5A5]/10 rounded-lg p-2 transition-all min-w-0"
          disabled={!onFollowingClick}
        >
          <div className="text-lg sm:text-xl font-bold text-white group-hover:text-[#E8A5A5] transition-colors">{stats.following}</div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide group-hover:text-[#E8A5A5] transition-colors text-center">
            FOLLOWING
          </div>
        </button>
        <button
          onClick={onFollowersClick}
          className="group flex flex-col items-center justify-center border border-[#FF6B9D] md:border-opacity-60 hover:bg-[#FF6B9D]/10 rounded-lg p-2 transition-all min-w-0"
          disabled={!onFollowersClick}
        >
          <div className="text-lg sm:text-xl font-bold text-white group-hover:text-[#FF6B9D] transition-colors">{stats.followers.toLocaleString()}</div>
          <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide group-hover:text-[#FF6B9D] transition-colors text-center">
            FOLLOWERS
          </div>
        </button>
      </div>
    </div>
  );
};
