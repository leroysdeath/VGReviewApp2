import React, { useState } from 'react';
import { Search, Users, UserPlus, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockUsers } from '../data/mockData';

export const UserSearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);

  const filteredUsers = mockUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.bio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFollow = (userId: string) => {
    setFollowingUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-6">Discover Users</h1>
          
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Popular Reviewers Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Popular Reviewers</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockUsers.slice(0, 3).map((user) => (
              <div key={user.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <Link 
                      to={`/user/${user.id}`}
                      className="text-lg font-semibold text-white hover:text-purple-400 transition-colors"
                    >
                      {user.username}
                    </Link>
                    <p className="text-gray-400 text-sm">{user.reviewCount} reviews</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{user.bio}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{user.followers} followers</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFollow(user.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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

        {/* Search Results */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            {searchTerm ? `Search Results (${filteredUsers.length})` : 'All Users'}
          </h2>
          <p className="text-gray-400">
            {searchTerm 
              ? `Found ${filteredUsers.length} users matching "${searchTerm}"`
              : `Browse all ${filteredUsers.length} users`
            }
          </p>
        </div>

        {/* User List */}
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <Link 
                      to={`/user/${user.id}`}
                      className="text-lg font-semibold text-white hover:text-purple-400 transition-colors"
                    >
                      {user.username}
                    </Link>
                    <p className="text-gray-400 text-sm">{user.bio}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-white font-semibold">{user.reviewCount}</div>
                    <div className="text-gray-400 text-xs">Reviews</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">{user.followers}</div>
                    <div className="text-gray-400 text-xs">Followers</div>
                  </div>
                  <button
                    onClick={() => toggleFollow(user.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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

        {/* Pagination */}
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
      </div>
    </div>
  );
};