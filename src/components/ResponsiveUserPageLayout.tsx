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

  // Safe access functions with null checks
  const getSafeAvatar = (): string => {
    if (!user?.avatar || typeof user.avatar !== 'string' || user.avatar.trim() === '') {
      return 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150';
    }
    return user.avatar;
  };

  const getSafeUsername = (): string => {
    return user?.username && typeof user.username === 'string' ? user.username : 'Unknown User';
  };

  const getSafeBio = (): string => {
    return user?.bio && typeof user.bio === 'string' ? user.bio : 'Gaming enthusiast';
  };

  const getSafeWebsite = (): string | null => {
    return user?.website && typeof user.website === 'string' ? user.website : null;
  };

  // Handle image load errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    target.src = 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150';
  };

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
                src={getSafeAvatar()}
                alt={getSafeUsername()}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                onError={handleImageError}
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-white">{getSafeUsername()}</h1>
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                    PATRON
                  </span>
                </div>
                <p className="text-blue-400 text-sm mb-3">{getSafeBio()}</p>
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
                {getSafeWebsite() ? (
                  <a 
                    href={getSafeWebsite()!} 
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
              <div className="flex items-center gap-1">
                <span>📍 Online Gaming Community</span>
              </div>
              <div className="flex items-center gap-1">
                <span>📅 Member since {user?.joinDate || 'Unknown'}</span>
              </div>
            </div>

            {/* Stats Section */}
            <div className="flex justify-between items-center py-4 border-t border-gray-700">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{stats?.films || 0}</div>
                <div className="text-xs text-gray-400">Games</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{stats?.thisYear || 0}</div>
                <div className="text-xs text-gray-400">This Year</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{stats?.lists || 0}</div>
                <div className="text-xs text-gray-400">Lists</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{stats?.following || 0}</div>
                <div className="text-xs text-gray-400">Following</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{stats?.followers || 0}</div>
                <div className="text-xs text-gray-400">Followers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
          <div className="overflow-x-auto">
            <nav className="flex">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
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
        <div className="p-4">
          {children}
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Dummy Test Banner - only show for dummy page */}
      {isDummy && (
        <div className="bg-blue-600 text-white p-4 text-center">
          <h2 className="text-lg font-semibold">👤 Dummy Test User Profile - Desktop</h2>
          <p className="text-sm opacity-90">Letterboxd-inspired design</p>
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
                  src={getSafeAvatar()}
                  alt={getSafeUsername()}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                  onError={handleImageError}
                  loading="lazy"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{getSafeUsername()}</h1>
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                    PATRON
                  </span>
                  <button className="text-gray-400 hover:text-white">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
                
                <p className="text-blue-400 text-sm mb-3">{getSafeBio()}</p>
                
                <div className="flex items-center gap-1 text-gray-400 text-sm mb-4">
                  <span>🎮 platform 9¾</span>
                  <span className="mx-2">🔗</span>
                  {getSafeWebsite() ? (
                    <a 
                      href={getSafeWebsite()!} 
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
                
                <div className="text-gray-400 text-sm">
                  <span>📍 Online Gaming Community • 📅 Member since {user?.joinDate || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats?.films || 0}</div>
                <div className="text-sm text-gray-400">Games</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats?.thisYear || 0}</div>
                <div className="text-sm text-gray-400">This Year</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats?.lists || 0}</div>
                <div className="text-sm text-gray-400">Lists</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats?.following || 0}</div>
                <div className="text-sm text-gray-400">Following</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats?.followers || 0}</div>
                <div className="text-sm text-gray-400">Followers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="border-t border-gray-700">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
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
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
};
