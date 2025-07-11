import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { ActivityFeed } from '../components/ActivityFeed';
import { useUserFollow } from '../hooks/useUserFollow';
import { Link } from 'react-router-dom';
import { Users, UserPlus } from 'lucide-react';
import { LazyImage } from '../components/LazyImage';

export const ActivityFeedPage: React.FC = () => {
  const {
    activities,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  } = useActivityFeed({
    pageSize: 20,
    autoRefresh: true
  });

  const {
    following,
    getFollowing
  } = useUserFollow();

  // Refresh both activities and following list
  const handleRefresh = async () => {
    await refresh();
    if (following.length === 0) {
      await getFollowing(1); // Assuming current user has ID 1 for demo
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <Helmet>
        <title>Activity Feed | GameVault</title>
        <meta name="description" content="See what your friends are playing, rating, and reviewing" />
      </Helmet>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Activity Feed</h1>
          
          <Link
            to="/discover"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Discover more games
          </Link>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main feed */}
          <div className="md:col-span-2">
            <ActivityFeed
              activities={activities}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onRefresh={handleRefresh}
              emptyMessage="Your activity feed is empty"
              className="mb-6"
            />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Following section */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-400" />
                  Following
                </h2>
                
                <Link
                  to="/users"
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Find Users
                </Link>
              </div>
              
              {following.length === 0 ? (
                <div className="text-center py-6">
                  <UserPlus className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm mb-4">
                    Follow other users to see their activity
                  </p>
                  <Link
                    to="/users"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-block"
                  >
                    Browse Users
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {following.slice(0, 5).map((follow) => (
                    <Link
                      key={follow.id}
                      to={`/user/${follow.following_id}`}
                      className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {follow.following?.picurl ? (
                        <LazyImage
                          src={follow.following.picurl}
                          alt={follow.following.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                          <span className="text-gray-400 font-medium">
                            {follow.following?.name.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                      
                      <span className="text-white">{follow.following?.name}</span>
                    </Link>
                  ))}
                  
                  {following.length > 5 && (
                    <Link
                      to="/following"
                      className="block text-center text-sm text-purple-400 hover:text-purple-300 transition-colors pt-2"
                    >
                      View all {following.length} following
                    </Link>
                  )}
                </div>
              )}
            </div>
            
            {/* Suggested users */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-medium text-white mb-4">Suggested Users</h2>
              
              <div className="space-y-3">
                {/* This would be populated with actual suggested users */}
                <div className="flex items-center justify-between p-2 hover:bg-gray-700 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                    <span className="text-white">GameMaster92</span>
                  </div>
                  
                  <button className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
                    Follow
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-2 hover:bg-gray-700 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                    <span className="text-white">RPGLover</span>
                  </div>
                  
                  <button className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
                    Follow
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-2 hover:bg-gray-700 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                    <span className="text-white">StrategyGuru</span>
                  </div>
                  
                  <button className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
                    Follow
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};