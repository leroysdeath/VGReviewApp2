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

interface UserPageLayoutProps {
  user: UserInfo;
  stats: UserStats;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
  isDummy?: boolean;
}

const TABS = [
  { key: 'top5', label: 'Top 5' },
  { key: 'top50', label: 'Top 50' },
  { key: 'reviews', label: 'Reviews' },
];

export const UserPageLayout: React.FC<UserPageLayoutProps> = ({
  user,
  stats,
  activeTab,
  onTabChange,
  children,
  isDummy = false
}) => {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Dummy Test Banner - only show for dummy page */}
      {isDummy && (
        <div className="bg-blue-600 text-white p-4 text-center">
          <h2 className="text-lg font-semibold">👤 Dummy Test User Profile - Letterboxd Style</h2>
          <p className="text-sm opacity-90">This is a comprehensive test profile showcasing the new Letterboxd-inspired design</p>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between gap-6">
            {/* Profile Image */}
            <div className="relative flex-shrink-0">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
              />
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{user.username}</h1>
                <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                  PATRON
                </span>
                <button className="text-gray-400 hover:text-white">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
              
              <p className="text-blue-400 text-sm mb-3">{user.bio}</p>
              
              <div className="flex items-center gap-1 text-gray-400 text-sm mb-4">
                <span>🎮 platform 9¾</span>
                <span className="mx-2">🔗</span>
                <span>{isDummy ? 'dummytestuser.card.co' : 'gamevault.card.co'}</span>
              </div>
            </div>

            {/* Stats Section - Moved to the right */}
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
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
};