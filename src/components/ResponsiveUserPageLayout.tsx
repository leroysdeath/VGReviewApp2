import React, { ReactNode } from 'react';
import { Settings, ExternalLink } from 'lucide-react';
import { useResponsive } from '../hooks/useResponsive';

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

interface ResponsiveUserPageLayoutProps {
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
  { key: 'activity', label: 'Activity' },
  { key: 'lists', label: 'Lists' },
];

export const ResponsiveUserPageLayout: React.FC<ResponsiveUserPageLayoutProps> = ({
  user,
  stats,
  activeTab,
  onTabChange,
  children,
  isDummy = false
}) => {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-900">
        {/* Dummy Test Banner - only show for dummy page */}
        {isDummy && (
          <div className="bg-blue-600 text-white p-4 text-center">
            <h2 className="text-lg font-semibold">👤 Dummy Test User Profile - Mobile</h2>
            <p className="text-sm opacity-90">Mobile-optimized user profile layout</p>
          </div>
        )}

        {/* Profile Info Section - Top */}
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="px-4 py-6">
            {/* Profile Image and Basic Info */}
            <div className="flex items-start gap-4 mb-6">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-white">{user.username}</h1>
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                    PATRON
                  </span>
                </div>
                <p className="text-blue-400 text-sm mb-3">{user.bio}</p>
              </div>
              <button className="text-gray-400 hover:text-white p-2">
                <Settings className="h-5 w-5" />
              </button>
            </div>
            
            {/* Additional Profile Info */}
            <div className="space-y-2 text-sm text-gray-400 mb-4">
              <div className="flex items-center gap-1">
                <span>🎮 platform 9¾</span>
                <span className="mx-2">🔗</span>
                {user.website ? (
                  <a 
                    href={user.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-blue-400 transition-colors flex items-center gap-1"
                  >
                    {isDummy ? 'dummytestuser.card.co' : 'gamevault.card.co'}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span>{isDummy ? 'dummytestuser.card.co' : 'gamevault.card.co'}</span>
                )}
              </div>
              
              {user.location && (
                <div className="text-gray-400 text-sm">
                  📍 {user.location}
                </div>
              )}
              
              {user.joinDate && (
                <div className="text-gray-400 text-sm mt-1">
                  📅 Joined {user.joinDate}
                </div>
              )}
            </div>

            {/* Stats Grid - Mobile */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{stats.films.toLocaleString()}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">GAMES</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{stats.thisYear}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">THIS YEAR</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{stats.lists}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">LISTS</div>
              </div>
            </div>

            {/* Following/Followers - Mobile */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{stats.following}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">FOLLOWING</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{stats.followers.toLocaleString()}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">FOLLOWERS</div>
              </div>
            </div>

            {/* Additional Stats - Mobile */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-400">87%</div>
                <div className="text-xs text-gray-400">Completion Rate</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-purple-400">8.2</div>
                <div className="text-xs text-gray-400">Avg Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Mobile */}
        <div className="bg-gray-800 border-b border-gray-700 overflow-x-auto">
          <nav className="flex space-x-8 px-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
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

        {/* Content Area - Mobile */}
        <div className="px-4 py-6">
          {children}
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Dummy Test Banner - only show for dummy page */}
      {isDummy && (
        <div className="bg-blue-600 text-white p-4 text-center">
          <h2 className="text-lg font-semibold">👤 Dummy Test User Profile - Desktop</h2>
          <p className="text-sm opacity-90">Desktop-optimized user profile layout with Letterboxd-style design</p>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-600"
              />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-4xl font-bold text-white">{user.username}</h1>
                <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded">
                  PATRON
                </span>
                <button className="text-gray-400 hover:text-white p-2 ml-auto">
                  <Settings className="h-6 w-6" />
                </button>
              </div>
              
              <p className="text-xl text-blue-400 mb-4">{user.bio}</p>
              
              {/* Additional Info */}
              <div className="space-y-2 text-gray-400">
                <div className="flex items-center gap-2">
                  <span>🎮 platform 9¾</span>
                  <span>•</span>
                  {user.website ? (
                    <a 
                      href={user.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-blue-400 transition-colors flex items-center gap-1"
                    >
                      {isDummy ? 'dummytestuser.card.co' : 'gamevault.card.co'}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <span>{isDummy ? 'dummytestuser.card.co' : 'gamevault.card.co'}</span>
                  )}
                </div>
                
                {user.location && (
                  <div className="flex items-center gap-2">
                    <span>📍 {user.location}</span>
                  </div>
                )}
                
                {user.joinDate && (
                  <div className="flex items-center gap-2">
                    <span>📅 Joined {user.joinDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex-shrink-0">
              <div className="grid grid-cols-5 gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">{stats.films.toLocaleString()}</div>
                  <div className="text-sm text-gray-400 uppercase tracking-wide">GAMES</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.thisYear}</div>
                  <div className="text-sm text-gray-400 uppercase tracking-wide">THIS YEAR</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.lists}</div>
                  <div className="text-sm text-gray-400 uppercase tracking-wide">LISTS</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.following}</div>
                  <div className="text-sm text-gray-400 uppercase tracking-wide">FOLLOWING</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.followers.toLocaleString()}</div>
                  <div className="text-sm text-gray-400 uppercase tracking-wide">FOLLOWERS</div>
                </div>
              </div>
              
              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-green-400">87%</div>
                  <div className="text-sm text-gray-400">Completion Rate</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-purple-400">8.2</div>
                  <div className="text-sm text-gray-400">Avg Rating</div>
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
