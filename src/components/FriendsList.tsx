import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FriendWithStatus } from '../types/social';
import { User, UserPlus, UserMinus, UserCheck, Search, X, MoreHorizontal, MessageSquare } from 'lucide-react';
import { LazyImage } from './LazyImage';

interface FriendsListProps {
  friends: FriendWithStatus[];
  pendingRequests?: FriendWithStatus[];
  onAcceptRequest?: (requestId: number) => Promise<boolean>;
  onRejectRequest?: (requestId: number) => Promise<boolean>;
  onRemoveFriend?: (friendId: number) => Promise<boolean>;
  onMessageFriend?: (friendId: number) => void;
  loading?: boolean;
  className?: string;
}

export const FriendsList: React.FC<FriendsListProps> = ({
  friends,
  pendingRequests = [],
  onAcceptRequest,
  onRejectRequest,
  onRemoveFriend,
  onMessageFriend,
  loading = false,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequests, setShowRequests] = useState(pendingRequests.length > 0);

  // Filter friends by search query
  const filteredFriends = friends.filter(friend => 
    friend.friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Search and filter */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowRequests(!showRequests)}
            className="flex items-center justify-between w-full p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors mb-2"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-400" />
              <span className="font-medium text-white">Friend Requests</span>
              <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            </div>
            <svg
              className={`h-5 w-5 text-gray-400 transform transition-transform ${showRequests ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showRequests && (
            <div className="space-y-2 mb-6">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    {request.friend.picurl ? (
                      <LazyImage
                        src={request.friend.picurl}
                        alt={request.friend.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <Link
                        to={`/user/${request.friend.id}`}
                        className="font-medium text-white hover:text-purple-400 transition-colors"
                      >
                        {request.friend.name}
                      </Link>
                      <p className="text-sm text-gray-400">Wants to be friends</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {onAcceptRequest && (
                      <button
                        onClick={() => onAcceptRequest(request.id)}
                        className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                        title="Accept request"
                      >
                        <UserCheck className="h-4 w-4" />
                      </button>
                    )}
                    {onRejectRequest && (
                      <button
                        onClick={() => onRejectRequest(request.id)}
                        className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        title="Reject request"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Friends list */}
      {filteredFriends.length > 0 ? (
        <div className="space-y-2">
          {filteredFriends.map((friend) => (
            <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
              <div className="flex items-center gap-3">
                {friend.friend.picurl ? (
                  <LazyImage
                    src={friend.friend.picurl}
                    alt={friend.friend.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div>
                  <Link
                    to={`/user/${friend.friend.id}`}
                    className="font-medium text-white hover:text-purple-400 transition-colors"
                  >
                    {friend.friend.name}
                  </Link>
                  {friend.lastActive && (
                    <p className="text-xs text-gray-400">Active {friend.lastActive}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {onMessageFriend && (
                  <button
                    onClick={() => onMessageFriend(friend.friend.id)}
                    className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                    title="Send message"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                )}
                <div className="relative group">
                  <button
                    className="p-2 bg-gray-700 text-gray-400 rounded-full hover:bg-gray-600 hover:text-white transition-colors"
                    title="More options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg py-1 z-10 hidden group-hover:block">
                    {onRemoveFriend && (
                      <button
                        onClick={() => onRemoveFriend(friend.friend.id)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-400 hover:bg-gray-800 transition-colors"
                      >
                        <UserMinus className="h-4 w-4" />
                        <span>Remove friend</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-800 rounded-lg">
          <User className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchQuery ? 'No friends match your search' : 'No friends yet'}
          </h3>
          <p className="text-gray-400 mb-4">
            {searchQuery
              ? `Try a different search term`
              : `Connect with other gamers to build your friends list`}
          </p>
          {!searchQuery && (
            <Link
              to="/users"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Find Friends</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};