import React, { ReactNode } from 'react';
import { Settings } from 'lucide-react';

interface UserStats {
  films: number;
  thisYear: number;
  lists: number;
  following: number;
  followers: number;
}

interface UserInfo {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  joinDate?: string;
  location?: string;
  website?: string;
}

interface MobileUserPageLayoutProps {
  user: UserInfo;
  stats: UserStats;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
}

const TABS = [
  { key: 'top5', label: 'Top 5' },
  { key: 'top50', label: 'Top 50' },
  { key: 'reviews', label: 'Reviews' },
];

export const MobileUserPageLayout: React.FC<MobileUserPageLayoutProps> = ({
  user,
  stats,
  activeTab,
  onTabChange,
  children,
}) => {
  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Profile Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="px-4 py-6">
          <div className="flex items-start gap-4 mb-4">
            <img
              src={user.avatar}
              alt={user.username}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-xl font-bold text-white">{user.username}</h1>
                <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                  PATRON
                </span>
              </div>
              <p className="text-blue-400 text-sm mb-2">{user.bio}</p>
              {user.joinDate && (
                <p className="text-gray-400 text-xs">📅 Joined {user.joinDate}</p>
              )}
            </div>
            <button className="text-gray-400 hover:text-white p-2">
              <Settings className="h-5 w-5" />
            </button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-5 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-white">{stats.films.toLocaleString()}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">GAMES</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{stats.thisYear}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">THIS YEAR</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{stats.lists}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">LISTS</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{stats.following}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">FOLLOWING</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{stats.followers.toLocaleString()}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">FOLLOWERS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-16 z-30">
        <div className="px-4">
          <nav className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`flex-1 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 py-6">
        {children}
      </div>
    </div>
  );
};