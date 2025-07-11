import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ForumThreadWithStats } from '../types/social';
import { MessageSquare, Pin, Lock, User, Clock, Plus, Search, Filter, ChevronDown } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

interface ForumThreadListProps {
  threads: ForumThreadWithStats[];
  categoryName: string;
  categoryId: number;
  onCreateThread?: () => void;
  loading?: boolean;
  className?: string;
}

export const ForumThreadList: React.FC<ForumThreadListProps> = ({
  threads,
  categoryName,
  categoryId,
  onCreateThread,
  loading = false,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [showFilters, setShowFilters] = useState(false);

  // Format date for last post
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return formatDistanceToNow(date, { addSuffix: true });
    }
  };

  // Filter and sort threads
  const filteredThreads = threads
    .filter(thread => 
      thread.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.last_post_at).getTime() - new Date(a.last_post_at).getTime();
      } else {
        return b.view_count - a.view_count;
      }
    });

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="h-8 w-16 bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with category name and create button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">{categoryName}</h2>
        
        {onCreateThread && (
          <button
            onClick={onCreateThread}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Thread</span>
          </button>
        )}
      </div>
      
      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threads..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>
          
          <div className="flex gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular')}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
            </select>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700" />
                <span className="text-gray-300">Pinned threads</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700" />
                <span className="text-gray-300">Threads with polls</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700" />
                <span className="text-gray-300">Threads with images</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700" />
                <span className="text-gray-300">Exclude locked threads</span>
              </label>
            </div>
          </div>
        )}
      </div>
      
      {/* Threads list */}
      {filteredThreads.length > 0 ? (
        <div className="space-y-3">
          {filteredThreads.map((thread) => (
            <div
              key={thread.id}
              className={`p-4 rounded-lg ${
                thread.is_pinned
                  ? 'bg-purple-900 bg-opacity-20 border border-purple-800'
                  : 'bg-gray-800 hover:bg-gray-750'
              } transition-colors`}
            >
              <div className="flex items-start gap-4">
                <div className="hidden md:block">
                  {thread.user?.picurl ? (
                    <LazyImage
                      src={thread.user.picurl}
                      alt={thread.user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {thread.is_pinned && (
                      <Pin className="h-4 w-4 text-purple-400" />
                    )}
                    {thread.is_locked && (
                      <Lock className="h-4 w-4 text-red-400" />
                    )}
                    <Link
                      to={`/forum/thread/${thread.id}/${thread.slug}`}
                      className="font-medium text-white hover:text-purple-400 transition-colors line-clamp-1"
                    >
                      {thread.title}
                    </Link>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span>
                      By{' '}
                      <Link
                        to={`/user/${thread.user?.id}`}
                        className="text-gray-300 hover:text-purple-400 transition-colors"
                      >
                        {thread.user?.name}
                      </Link>
                    </span>
                    <span>{format(new Date(thread.created_at), 'MMM d, yyyy')}</span>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{thread.post_count} posts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <span>{thread.view_count} views</span>
                    </div>
                  </div>
                </div>
                
                {thread.last_post && (
                  <div className="hidden md:block text-right text-xs">
                    <div className="text-gray-300">
                      Last post by{' '}
                      <span className="text-purple-400">{thread.last_post.user_name}</span>
                    </div>
                    <div className="text-gray-400 mt-1">
                      {formatDate(thread.last_post.created_at)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchQuery ? 'No threads match your search' : 'No threads yet'}
          </h3>
          <p className="text-gray-400 mb-4">
            {searchQuery
              ? `Try a different search term`
              : `Be the first to start a discussion in this category`}
          </p>
          {!searchQuery && onCreateThread && (
            <button
              onClick={onCreateThread}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Thread</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};