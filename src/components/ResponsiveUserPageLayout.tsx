import React, { ReactNode, useState, useEffect, lazy, Suspense } from 'react';
import { Settings, ExternalLink, UserPlus, UserCheck } from 'lucide-react';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { useFollow } from '../hooks/useFollow';
import { FollowersFollowingModal } from './FollowersFollowingModal';
import { GamesModal } from './GamesModal';
import { ReviewsModal } from './ReviewsModal';
import { ProfileUpdateData, updateUserProfile, getCurrentAuthUser } from '../services/profileService';

// Lazy load UserSettingsModal to avoid initialization issues
const UserSettingsModal = lazy(() => import('./profile/UserSettingsModal').then(module => ({
  default: module.UserSettingsModal
})));

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
  { key: 'top10', label: 'Top 10' },
  { key: 'reviews', label: 'Wishlist' },
  { key: 'activity', label: 'Activity' },
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
  const { user: authUser, isAuthenticated } = useAuth();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { toggleFollow, isFollowing, loading: followLoading, canFollow } = useFollow();
  const [isUserFollowing, setIsUserFollowing] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'followers' | 'following'>('followers');
  const [isGamesModalOpen, setIsGamesModalOpen] = useState(false);
  const [gamesModalInitialTab, setGamesModalInitialTab] = useState<'all' | 'started' | 'finished'>('all');
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  
  // Check if current user is viewing their own profile
  // Note: authUser.id is the Supabase auth UUID, user.id is the database integer ID
  // We need to compare against provider_id field or use a different approach
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  // Handle profile save
  const handleSaveProfile = async (profileData: ProfileUpdateData) => {
    try {
      console.log('🟢 ResponsiveUserPageLayout - handleSaveProfile called');
      console.log('📥 ProfileData received from form:', {
        ...profileData,
        avatar: profileData.avatar ? `[${profileData.avatar.length} chars]` : undefined
      });

      // Get current authenticated user
      const authResult = await getCurrentAuthUser();
      if (!authResult.success || !authResult.data) {
        throw new Error(authResult.error || 'User not authenticated');
      }

      const { id: providerId } = authResult.data;
      console.log('👤 Authenticated user provider_id:', providerId);

      // Use profileService to update the profile
      const updateResult = await updateUserProfile(providerId, profileData);
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update profile');
      }

      console.log('✅ Profile updated successfully:', updateResult.data);
      
      // Optionally refresh the page or update local state
      window.location.reload();
      
      return;
    } catch (error) {
      console.error('🔴 Error in handleSaveProfile:', error);
      throw error;
    }
  };
  
  useEffect(() => {
    const checkIsOwnProfile = async () => {
      if (!isAuthenticated || !authUser?.id) {
        setIsOwnProfile(false);
        return;
      }
      
      // Fetch the database user record for the current auth user
      const { data: currentUserData } = await supabase
        .from('user')
        .select('id')
        .eq('provider_id', authUser.id)
        .single();
        
      const isOwn = currentUserData?.id === parseInt(user.id);
      setIsOwnProfile(isOwn);
      
      // Check if following this user (only if not own profile)
      if (!isOwn && canFollow) {
        const followingStatus = await isFollowing(user.id);
        setIsUserFollowing(followingStatus);
      }
    };
    
    checkIsOwnProfile();
  }, [isAuthenticated, authUser?.id, user.id, canFollow, isFollowing]);

  const handleSettingsClick = () => {
    if (isOwnProfile) {
      setIsSettingsModalOpen(true);
    }
  };

  const handleFollowClick = async () => {
    if (!canFollow) return;
    
    const result = await toggleFollow(user.id);
    if (result.success) {
      setIsUserFollowing(result.isFollowing || false);
    }
  };

  const handleFollowersClick = () => {
    setModalInitialTab('followers');
    setIsFollowersModalOpen(true);
  };

  const handleFollowingClick = () => {
    setModalInitialTab('following');
    setIsFollowersModalOpen(true);
  };

  const handleGamesClick = () => {
    setGamesModalInitialTab('all');
    setIsGamesModalOpen(true);
  };

  const handleReviewsClick = () => {
    setIsReviewsModalOpen(true);
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
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-20 h-20 rounded-full border-2 border-gray-600 bg-purple-600 flex items-center justify-center text-white font-bold text-2xl ${user.avatar ? 'hidden' : 'flex'}`}
                style={{ display: user.avatar ? 'none' : 'flex' }}
              >
                {user.username ? user.username.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-white">{user.username}</h1>
                  {isOwnProfile && (
                    <button 
                      onClick={handleSettingsClick}
                      className="text-gray-400 hover:text-white p-1"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  )}
                  {!isOwnProfile && isAuthenticated && (
                    <button
                      onClick={handleFollowClick}
                      disabled={followLoading}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        followLoading
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : isUserFollowing
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {followLoading ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : isUserFollowing ? (
                        <>
                          <UserCheck className="h-3 w-3" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3" />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-blue-400 text-sm mb-3">{user.bio}</p>
                
                {/* Additional Profile Info */}
                {(user.platform || user.website) && (
                  <div className="flex items-center gap-1 text-gray-400 text-sm mb-2">
                    {user.platform && (
                      <>
                        <span>🎮 {user.platform}</span>
                        {user.website && <span className="mx-2">•</span>}
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
              <button
                onClick={handleGamesClick}
                className="text-center hover:bg-gray-700 rounded-lg p-2 transition-colors"
              >
                <div className="text-lg font-bold text-white">{stats.films.toLocaleString()}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors">GAMES</div>
              </button>
              <button
                onClick={handleReviewsClick}
                className="text-center hover:bg-gray-700 rounded-lg p-2 transition-colors"
              >
                <div className="text-lg font-bold text-white">{stats.thisYear}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors">REVIEWS</div>
              </button>
              <div>
                <div className="text-lg font-bold text-white">{stats.lists}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">LISTS</div>
              </div>
              <button
                onClick={handleFollowingClick}
                className="text-center hover:bg-gray-700 rounded-lg p-2 transition-colors"
              >
                <div className="text-lg font-bold text-white">{stats.following}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors">
                  FOLLOWING
                </div>
              </button>
              <button
                onClick={handleFollowersClick}
                className="text-center hover:bg-gray-700 rounded-lg p-2 transition-colors"
              >
                <div className="text-lg font-bold text-white">{stats.followers.toLocaleString()}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors">
                  FOLLOWERS
                </div>
              </button>
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

        {/* Settings Modal */}
        <Suspense fallback={<div />}>
          <UserSettingsModal 
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            userId={authUser?.id || ''}
            onSave={handleSaveProfile}
          />
        </Suspense>
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
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-20 h-20 rounded-full border-2 border-gray-600 bg-purple-600 flex items-center justify-center text-white font-bold text-2xl ${user.avatar ? 'hidden' : 'flex'}`}
                  style={{ display: user.avatar ? 'none' : 'flex' }}
                >
                  {user.username ? user.username.charAt(0).toUpperCase() : '?'}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{user.username}</h1>
                  {isOwnProfile && (
                    <button 
                      onClick={handleSettingsClick}
                      className="text-gray-400 hover:text-white p-1"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  )}
                  {!isOwnProfile && isAuthenticated && (
                    <button
                      onClick={handleFollowClick}
                      disabled={followLoading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        followLoading
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : isUserFollowing
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {followLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Loading...
                        </>
                      ) : isUserFollowing ? (
                        <>
                          <UserCheck className="h-4 w-4" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                <p className="text-blue-400 text-sm mb-3">{user.bio}</p>
                
                {/* Additional Profile Info */}
                {(user.platform || user.website || user.location || user.joinDate) && (
                  <div className="space-y-2 text-sm text-gray-400 mb-4">
                    {(user.platform || user.website) && (
                      <div className="flex items-center gap-1">
                        {user.platform && (
                          <>
                            <span>🎮 {user.platform}</span>
                            {user.website && <span className="mx-2">•</span>}
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
              </div>
            </div>
            
            {/* Profile Stats Section */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-6">
                <button
                  onClick={handleGamesClick}
                  className="text-center hover:bg-gray-700 rounded-lg p-2 transition-colors"
                >
                  <div className="text-xl font-bold text-white">{stats.films.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors">GAMES</div>
                </button>
                <button
                  onClick={handleReviewsClick}
                  className="text-center hover:bg-gray-700 rounded-lg p-3 transition-colors"
                >
                  <div className="text-xl font-bold text-white">{stats.thisYear}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors">REVIEWS</div>
                </button>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.lists}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">LISTS</div>
                </div>
                <button
                  onClick={handleFollowingClick}
                  className="text-center hover:bg-gray-700 rounded-lg p-2 transition-colors"
                >
                  <div className="text-xl font-bold text-white">{stats.following}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors">
                    FOLLOWING
                  </div>
                </button>
                <button
                  onClick={handleFollowersClick}
                  className="text-center hover:bg-gray-700 rounded-lg p-2 transition-colors"
                >
                  <div className="text-xl font-bold text-white">{stats.followers.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide hover:text-purple-400 transition-colors">
                    FOLLOWERS
                  </div>
                </button>
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

      {/* Settings Modal */}
      <Suspense fallback={<div />}>
        <UserSettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          userId={authUser?.id || ''}
          onSave={handleSaveProfile}
        />
      </Suspense>

      {/* Followers/Following Modal */}
      <FollowersFollowingModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userId={user.id}
        userName={user.username}
        initialTab={modalInitialTab}
      />

      {/* Games Modal */}
      <GamesModal
        isOpen={isGamesModalOpen}
        onClose={() => setIsGamesModalOpen(false)}
        userId={user.id}
        userName={user.username}
        initialTab={gamesModalInitialTab}
      />

      {/* Reviews Modal */}
      <ReviewsModal
        isOpen={isReviewsModalOpen}
        onClose={() => setIsReviewsModalOpen(false)}
        userId={user.id}
        userName={user.username}
      />
    </div>
  );
};
