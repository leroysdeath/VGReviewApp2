import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Users, UserPlus, UserCheck, TrendingUp, Clock, Filter, Star, MessageCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useResponsive } from '../hooks/useResponsive';
import { supabase } from '../services/supabase';

interface User {
  id: string;
  username: string;
  bio: string;
  avatar: string;
  reviewCount: number;
  followers: number;
  following: number;
  averageRating?: number;
  joinDate?: string;
  verified?: boolean;
}

export const UserSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'relevance' | 'followers' | 'reviews' | 'recent'>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const { isMobile } = useResponsive();

  // Load real users from Supabase
  useEffect(() => {
    loadUsers();
    loadRecentSearches();
    loadFollowingList();
  }, []);

  // Update URL when search term changes
  useEffect(() => {
    if (searchTerm) {
      setSearchParams({ q: searchTerm });
      saveRecentSearch(searchTerm);
    } else {
      setSearchParams({});
    }
  }, [searchTerm, setSearchParams]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      console.log('🔍 Loading users with real database counts...');
      
      // Get basic user data
      const { data: realUsers, error } = await supabase
        .from('user')
        .select(`
          id,
          name,
          bio,
          picurl,
          created_at
        `)
        .limit(50);

      if (error) {
        console.error('❌ Error loading users:', error);
        setUsers([]);
        return;
      }

      if (!realUsers || realUsers.length === 0) {
        console.log('ℹ️ No users found in database');
        setUsers([]);
        return;
      }

      console.log(`📊 Processing ${realUsers.length} users...`);

      // Create a map of user IDs for quick lookup
      const userIds = realUsers.map(user => user.id);

      // Get all follower counts in batch queries
      const { data: followerData, error: followerError } = await supabase
        .from('user_follow')
        .select('following_id')
        .in('following_id', userIds);

      const { data: followingData, error: followingError } = await supabase
        .from('user_follow')
        .select('follower_id')
        .in('follower_id', userIds);

      const { data: reviewData, error: reviewError } = await supabase
        .from('rating')
        .select('user_id, rating')
        .in('user_id', userIds);

      if (followerError) {
        console.error('❌ Error loading follower data:', followerError);
      }
      if (followingError) {
        console.error('❌ Error loading following data:', followingError);
      }
      if (reviewError) {
        console.error('❌ Error loading review data:', reviewError);
      }

      // Create lookup maps for counts (use string keys to match transformed user IDs)
      const followerCounts = new Map<string, number>();
      const followingCounts = new Map<string, number>();
      const reviewCounts = new Map<string, number>();
      const averageRatings = new Map<string, number>();

      // Count followers for each user
      if (followerData) {
        console.log(`📊 Processing ${followerData.length} follower relationships`);
        followerData.forEach(follow => {
          const userId = follow.following_id.toString();
          const count = followerCounts.get(userId) || 0;
          followerCounts.set(userId, count + 1);
        });
      }

      // Count following for each user
      if (followingData) {
        console.log(`📊 Processing ${followingData.length} following relationships`);
        followingData.forEach(follow => {
          const userId = follow.follower_id.toString();
          const count = followingCounts.get(userId) || 0;
          followingCounts.set(userId, count + 1);
        });
      }

      // Count reviews and calculate averages for each user
      if (reviewData) {
        console.log(`📊 Processing ${reviewData.length} reviews`);
        const userReviews = new Map<string, number[]>();
        
        reviewData.forEach(review => {
          const userId = review.user_id.toString();
          if (!userReviews.has(userId)) {
            userReviews.set(userId, []);
          }
          userReviews.get(userId)!.push(review.rating);
        });

        userReviews.forEach((ratings, userId) => {
          reviewCounts.set(userId, ratings.length);
          if (ratings.length > 0) {
            const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
            averageRatings.set(userId, parseFloat(average.toFixed(1)));
          }
        });
      }

      console.log('✅ All user data queries completed');

      // Transform Supabase users to match our interface with real data
      const transformedUsers = realUsers.map((user) => {
        const userIdStr = user.id.toString();
        const followerCount = followerCounts.get(userIdStr) || 0;
        const followingCount = followingCounts.get(userIdStr) || 0;
        
        console.log(`User ${user.name} (ID: ${userIdStr}): ${followerCount} followers, ${followingCount} following`);
        
        return {
          id: userIdStr,
          username: user.name || 'Anonymous',
          bio: user.bio || '',
          avatar: user.picurl || '',
          reviewCount: reviewCounts.get(userIdStr) || 0,
          followers: followerCount,
          following: followingCount,
          averageRating: averageRatings.get(userIdStr) || undefined,
          joinDate: user.created_at,
          verified: false // Could be added to user table later
        };
      });

      console.log('📈 User stats summary:', {
        totalUsers: transformedUsers.length,
        usersWithReviews: transformedUsers.filter(u => u.reviewCount > 0).length,
        usersWithFollowers: transformedUsers.filter(u => u.followers > 0).length,
        usersFollowingOthers: transformedUsers.filter(u => u.following > 0).length,
        totalFollowerRelationships: followerData?.length || 0,
        totalFollowingRelationships: followingData?.length || 0,
        totalReviews: transformedUsers.reduce((sum, u) => sum + u.reviewCount, 0),
        totalFollows: transformedUsers.reduce((sum, u) => sum + u.followers, 0),
        avgFollowers: transformedUsers.length > 0 ? 
          (transformedUsers.reduce((sum, u) => sum + u.followers, 0) / transformedUsers.length).toFixed(1) : 0,
        followersDetail: transformedUsers.map(u => ({ id: u.id, name: u.username, followers: u.followers }))
      });

      setUsers(transformedUsers);
    } catch (error) {
      console.error('💥 Unexpected error loading users:', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadRecentSearches = () => {
    try {
      const saved = localStorage.getItem('user_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveRecentSearch = (term: string) => {
    if (!term.trim() || term.length < 2) return;
    
    try {
      const updatedSearches = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
      setRecentSearches(updatedSearches);
      localStorage.setItem('user_recent_searches', JSON.stringify(updatedSearches));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const loadFollowingList = async () => {
    try {
      // In a real app, this would load from user's following list
      const saved = localStorage.getItem('following_users');
      if (saved) {
        setFollowingUsers(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading following list:', error);
    }
  };

  const toggleFollow = useCallback(async (userId: string) => {
    setFollowingUsers(prev => {
      const newFollowing = prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId];
      
      // Save to localStorage (in real app, would save to backend)
      localStorage.setItem('following_users', JSON.stringify(newFollowing));
      return newFollowing;
    });

    // In a real app, you would also make an API call here
    // await supabase.from('user_follows').insert/delete...
  }, []);

  // Memoized filtered and sorted users
  const filteredUsers = useMemo(() => {
    let filtered = users.filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.bio && user.bio.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Sort users based on selected criteria
    switch (sortBy) {
      case 'followers':
        filtered.sort((a, b) => b.followers - a.followers);
        break;
      case 'reviews':
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.joinDate || 0).getTime() - new Date(a.joinDate || 0).getTime());
        break;
      default: // relevance
        // For relevance, prioritize exact username matches, then bio matches
        filtered.sort((a, b) => {
          const aUsernameMatch = a.username.toLowerCase().includes(searchTerm.toLowerCase());
          const bUsernameMatch = b.username.toLowerCase().includes(searchTerm.toLowerCase());
          if (aUsernameMatch && !bUsernameMatch) return -1;
          if (!aUsernameMatch && bUsernameMatch) return 1;
          return b.followers - a.followers; // Secondary sort by followers
        });
    }

    return filtered;
  }, [users, searchTerm, sortBy]);

  // Popular reviewers (top users by review count)
  const popularReviewers = useMemo(() => {
    return [...users]
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 3);
  }, [users]);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('user_recent_searches');
  };

  const handleRecentSearchClick = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isMobile ? '' : 'max-w-7xl'}`}>
        
        {/* Header */}
        <div className="mb-8">
          <h1 className={`font-bold text-white mb-6 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
            Discover Users
          </h1>
          
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or bio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Search Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="relevance">Most Relevant</option>
                <option value="followers">Most Followers</option>
                <option value="reviews">Most Reviews</option>
                <option value="recent">Recently Joined</option>
              </select>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 transition-colors"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>

            {searchTerm && (
              <p className="text-gray-400 text-sm">
                {filteredUsers.length} users found
              </p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            
            {/* Popular Reviewers Section (when no search) */}
            {!searchTerm && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                  <h2 className={`font-bold text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                    Top Reviewers
                  </h2>
                </div>
                <div className={`gap-6 ${isMobile ? 'space-y-4' : 'grid md:grid-cols-2 lg:grid-cols-3'}`}>
                  {popularReviewers.map((user) => (
                    <div key={user.id} className={`bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors ${isMobile ? 'p-4' : 'p-6'}`}>
                      <div className={`flex items-center gap-4 ${isMobile ? 'mb-3' : 'mb-4'}`}>
                        <div className="relative">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className={`rounded-full object-cover ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}
                            />
                          ) : (
                            <div className={`rounded-full bg-purple-600 flex items-center justify-center text-white font-bold ${isMobile ? 'w-12 h-12 text-lg' : 'w-16 h-16 text-xl'}`}>
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {user.verified && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <UserCheck className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <Link 
                            to={`/user/${user.id}`}
                            className={`font-semibold text-white hover:text-purple-400 transition-colors ${isMobile ? 'text-base' : 'text-lg'}`}
                          >
                            {user.username}
                          </Link>
                          <div className="flex items-center gap-2">
                            <p className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {user.reviewCount} reviews
                            </p>
                            {user.averageRating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span className="text-yellow-500 text-xs">{user.averageRating}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {user.bio && (
                        <p className={`text-gray-300 mb-4 line-clamp-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {user.bio}
                        </p>
                      )}
                      <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-3' : ''}`}>
                        <div className={`flex items-center gap-4 text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{user.followers} followers</span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleFollow(user.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            isMobile ? 'text-xs' : 'text-sm'
                          } ${
                            followingUsers.includes(user.id)
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {followingUsers.includes(user.id) ? (
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            <div className="mb-6">
              <h2 className={`font-bold text-white mb-4 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                {searchTerm ? `Search Results (${filteredUsers.length})` : 'All Users'}
              </h2>
              <p className={`text-gray-400 ${isMobile ? 'text-sm' : ''}`}>
                {searchTerm 
                  ? `Found ${filteredUsers.length} users matching "${searchTerm}"`
                  : `Browse all ${users.length} users`
                }
              </p>
            </div>

            {/* Loading State */}
            {loadingUsers && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                <p className="text-gray-400 mt-2">Loading users...</p>
              </div>
            )}

            {/* User List */}
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className={`bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors ${isMobile ? 'p-4' : 'p-6'}`}>
                  <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-3' : ''}`}>
                    <div className={`flex items-center gap-4 ${isMobile ? 'w-full' : ''}`}>
                      <div className="relative">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className={`rounded-full object-cover ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}`}
                          />
                        ) : (
                          <div className={`rounded-full bg-purple-600 flex items-center justify-center text-white font-bold ${isMobile ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base'}`}>
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {user.verified && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <UserCheck className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/user/${user.id}`}
                          className={`font-semibold text-white hover:text-purple-400 transition-colors ${isMobile ? 'text-base' : 'text-lg'}`}
                        >
                          {user.username}
                        </Link>
                        {user.bio && (
                          <p className={`text-gray-400 ${isMobile ? 'text-xs truncate' : 'text-sm'}`}>
                            {user.bio}
                          </p>
                        )}
                        {user.averageRating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="text-yellow-500 text-xs">Avg: {user.averageRating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-6 ${isMobile ? 'w-full justify-between' : ''}`}>
                      <div className="text-center">
                        <div className={`text-white font-semibold ${isMobile ? 'text-sm' : ''}`}>
                          {user.reviewCount}
                        </div>
                        <div className="text-gray-400 text-xs">Reviews</div>
                      </div>
                      {!isMobile && (
                        <div className="text-center">
                          <div className="text-white font-semibold">{user.followers}</div>
                          <div className="text-gray-400 text-xs">Followers</div>
                        </div>
                      )}
                      <button
                        onClick={() => toggleFollow(user.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          isMobile ? 'text-xs' : 'text-sm'
                        } ${
                          followingUsers.includes(user.id)
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {followingUsers.includes(user.id) ? (
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
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* No Results */}
            {filteredUsers.length === 0 && !loadingUsers && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  {searchTerm ? 'No users found' : 'No users yet'}
                </h2>
                <p className="text-gray-400 mb-4">
                  {searchTerm 
                    ? 'Try adjusting your search terms'
                    : 'Be the first to join the community!'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-white">Recent Searches</h3>
                  </div>
                  <button
                    onClick={clearRecentSearches}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(term)}
                      className="block w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Stats */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Community Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Users</span>
                  <span className="text-white font-semibold">{users.length.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Active Reviewers</span>
                  <span className="text-white font-semibold">
                    {users.filter(u => u.reviewCount > 0).length.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Reviews</span>
                  <span className="text-purple-400 font-semibold">
                    {users.reduce((sum, u) => sum + u.reviewCount, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">You Follow</span>
                  <span className="text-green-400 font-semibold">{followingUsers.length}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Filters</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSearchTerm('pro')}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                >
                  Pro Reviewers
                </button>
                <button
                  onClick={() => setSortBy('recent')}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                >
                  New Members
                </button>
                <button
                  onClick={() => setSortBy('followers')}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                >
                  Most Popular
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination */}
        {!isMobile && filteredUsers.length > 20 && (
          <div className="mt-12 flex justify-center">
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
                Previous
              </button>
              <span className="px-4 py-2 bg-purple-600 text-white rounded-lg">1</span>
              <span className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">2</span>
              <span className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">3</span>
              <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
