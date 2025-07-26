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
  platform?: string;
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
            {(user.platform || user.website || user.location || user.joinDate) && (
              <div className="space-y-2 text-sm text-gray-400 mb-4">
                {(user.platform || user.website) && (
                  <div className="flex items-center gap-1">
                    {user.platform && (
                      <>
                        <span>🎮 {user.platform}</span>
                        {user.website && <span className="mx-2">🔗</span>}
                      </>
                    )}
                    {user.website && (
                      <a 
                        href={user.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 transition-colors flex items-center gap-1"
                      >
                        {user.website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
                
                {user.location && (
                  <div>📍 {user.location}</div>
                )}
                
                {user.joinDate && (
                  <div>📅 Joined {user.joinDate}</div>
                )}
              </div>
             )}
                 {user.website && (
                  <a 
                    href={user.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-blue-400 transition-colors flex items-center gap-1"
                  >
                    {user.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
               )}
                </div>
              </div>
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
        </div>
      </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-30">
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

        {/* Profile Data Section - Middle */}
        <div className="px-4 py-6">
          {children}
        </div>

        {/* Profile Details Section - Bottom */}
        <div className="bg-gray-800 border-t border-gray-700 mt-8">
          <div className="px-4 py-6">
            <h3 className="text-lg font-semibold text-white mb-4">Profile Stats</h3>
            
            {/* Main Stats Grid */}
            <div className="grid grid-cols-5 gap-3 text-center mb-6">
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

            {/* Additional Stats */}
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
      </div>
    );
  }

  // Desktop version (existing design)
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
            {/* Profile Info Section */}
            <div className="flex items-start gap-6">
              <div className="relative flex-shrink-0">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                />
              </div>
              
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
                
                {(user.platform || user.website) && (
                  <div className="flex items-center gap-1 text-gray-400 text-sm mb-4">
                    {user.platform && (
                      <>
                        <span>🎮 {user.platform}</span>
                        {user.website && <span className="mx-2">🔗</span>}
                      </>
                    )}
                    {user.website && (
                      <a 
                        href={user.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 transition-colors flex items-center gap-1"
                      >
                        {user.website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
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
            </div>
            
            {/* Profile Details Section */}
            <div className="flex-shrink-0 flex flex-col gap-4">
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
