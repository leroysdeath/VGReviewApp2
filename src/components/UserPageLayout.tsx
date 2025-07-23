import React, { ReactNode } from 'react';
import { ProfileInfo } from './ProfileInfo';
import { ProfileData } from './ProfileData';
import { FollowButton } from './FollowButton';
import { useAuth } from '../hooks/useAuth';

interface UserStats {
  gamesReviewed: number;
  thisYearReviews: number;
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
  onProfileUpdate?: (updates: { username?: string; bio?: string; avatar?: string }) => void;
  onFollowChange?: (isFollowing: boolean) => void;
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

export const UserPageLayout: React.FC<UserPageLayoutProps> = ({
  user,
  stats,
  activeTab,
  onTabChange,
  onProfileUpdate,
  onFollowChange,
  children,
  isDummy = false
}) => {
  const { user: currentUser } = useAuth();
  
  // Check if this is the current user's profile
  const isCurrentUser = currentUser?.id === user.id || 
                       (currentUser && user.id && currentUser.id.toString() === user.id.toString());

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Dummy Test Banner - only show for dummy page */}
      {isDummy && (
        <div className="bg-blue-600 text-white p-4 text-center">
          <h2 className="text-lg font-semibold">👤 Dummy Test User Profile</h2>
          <p className="text-sm opacity-90">This is a preview of how user profiles will look</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-6">
          <div className="p-6">
            {/* Profile Info Section */}
            <div className="mb-6">
              <ProfileInfo
                user={user}
                isCurrentUser={isCurrentUser}
                onProfileUpdate={onProfileUpdate}
                isDummy={isDummy}
              />
            </div>

            {/* Follow Button - Only show for other users when authenticated */}
            {!isCurrentUser && currentUser && (
              <div className="mb-6 flex justify-center">
                <FollowButton
                  userId={user.id}
                  onFollowChange={onFollowChange}
                  size="md"
                />
              </div>
            )}

            {/* Stats Section */}
            <div className="mb-6">
              <ProfileData stats={stats} />
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-700">
              <div className="flex space-x-8 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.key
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
};
