import React, { useState } from 'react';
import { Search, Users, UserPlus, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockUsers } from '../../data/mockData';

export const MobileUserSearchPage: React.FC = () => {
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
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-6">Discover Users</h1>
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Popular Reviewers Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Popular Reviewers</h2>
          <div className="space-y-4">
            {mockUsers.slice(0, 3).map((user) => (
              <div key={user.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/user/${user.id}`}
                      className="text-lg font-semibold text-white hover:text-purple-400 transition-colors block"
                    >
                      {user.username}
                    </Link>
                    <p className="text-gray-400 text-sm">{user.reviewCount} reviews</p>
                  </div>
                  <button
                    onClick={() => toggleFollow(user.id)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      followingUsers.includes(user.id)
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {followingUsers.includes(user.id) ? 'Following' : 'Follow'}
                  </button>
                </div>
                <p className="text-gray-300 text-sm line-clamp-2">{user.bio}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{user.followers} followers</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search Results */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white mb-2">
            {searchTerm ? `Search Results (${filteredUsers.length})` : 'All Users'}
          </h2>
          <p className="text-gray-400 text-sm">
            {searchTerm 
              ? `Found ${filteredUsers.length} users matching "${searchTerm}"`
              : `Browse all ${filteredUsers.length} users`
            }
          </p>
        </div>

        {/* User List */}
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/user/${user.id}`}
                      className="text-white font-semibold hover:text-purple-400 transition-colors block"
                    >
                      {user.username}
                    </Link>
                    <p className="text-gray-400 text-sm truncate">{user.bio}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-white font-semibold text-sm">{user.reviewCount}</div>
                    <div className="text-gray-400 text-xs">Reviews</div>
                  </div>
                  <button
                    onClick={() => toggleFollow(user.id)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      followingUsers.includes(user.id)
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {followingUsers.includes(user.id) ? 'Following' : 'Follow'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};