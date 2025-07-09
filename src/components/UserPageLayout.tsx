import React, { ReactNode } from 'react';
import { ProfileInfo } from './ProfileInfo';
import { ProfileDetails } from './ProfileDetails';

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
            {/* Profile Info Section */}
            <ProfileInfo user={user} isDummy={isDummy} />
            
            {/* Profile Details Section */}
            <ProfileDetails stats={stats} />
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