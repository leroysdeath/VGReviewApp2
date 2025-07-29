import React from 'react';

interface ProfileDetailsProps {
  stats: {
    films: number;
    thisYear: number;
    lists: number;
    following: number;
    followers: number;
  };
}

export const ProfileDetails: React.FC<ProfileDetailsProps> = ({ stats }) => {
  return (
    <div className="flex-shrink-0 flex flex-col gap-4">
      {/* Main Stats */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-xl font-bold text-white">{stats.films.toLocaleString()}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">GAMES</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-white">{stats.thisYear}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">THIS YEAR</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-white">{stats.lists}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">LISTS</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-white">{stats.following}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">FOLLOWING</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-white">{stats.followers.toLocaleString()}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">FOLLOWERS</div>
        </div>
      </div>
    </div>
  );
};