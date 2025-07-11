import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ForumPost, ForumThread } from '../types/social';
import { User, ThumbsUp, Flag, Reply, Edit, Trash, Share, MoreVertical, Clock } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { InfiniteScroll } from './InfiniteScroll';

interface ForumPostListProps {
  thread: ForumThread;
  posts: ForumPost[];
  onCreatePost?: (content: string) => Promise<ForumPost | null>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  className?: string;
}

export const ForumPostList: React.FC<ForumPostListProps> = ({
  thread,
  posts,
  onCreatePost,
  onLoadMore,
  hasMore = false,
  loading = false,
  className = ''
}) => {
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const replyFormRef = useRef<HTMLFormElement>(null);

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  // Handle reply submission
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyContent.trim() || submitting || !onCreatePost) return;
    
    setSubmitting(true);
    try {
      await onCreatePost(replyContent);
      setReplyContent('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={className}>
      {/* Thread title and info */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-white mb-3">{thread.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
          <span>
            Started by{' '}
            <Link
              to={`/user/${thread.user?.id}`}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              {thread.user?.name}
            </Link>
          </span>
          <span>{format(new Date(thread.created_at), 'MMM d, yyyy')}</span>
          <div className="flex items-center gap-1">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>{thread.view_count} views</span>
          </div>
          <div className="flex items-center gap-1">
            <Reply className="h-4 w-4" />
            <span>{posts.length} replies</span>
          </div>
        </div>
      </div>
      
      {/* Posts list */}
      <InfiniteScroll
        hasMore={hasMore}
        loading={loading}
        onLoadMore={onLoadMore}
        className="space-y-6"
      >
        {posts.map((post, index) => (
          <div
            key={post.id}
            id={`post-${post.id}`}
            className={`bg-gray-800 rounded-lg overflow-hidden ${
              index === 0 ? 'border-l-4 border-purple-600' : ''
            }`}
          >
            <div className="p-4 bg-gray-750 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {post.user?.picurl ? (
                  <LazyImage
                    src={post.user.picurl}
                    alt={post.user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                
                <div>
                  <Link
                    to={`/user/${post.user?.id}`}
                    className="font-medium text-white hover:text-purple-400 transition-colors"
                  >
                    {post.user?.name}
                  </Link>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(post.created_at)}</span>
                    {post.is_edited && <span>(Edited)</span>}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">#{index + 1}</span>
                <div className="relative group">
                  <button className="p-1 text-gray-400 hover:text-white transition-colors">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg py-1 z-10 hidden group-hover:block">
                    <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 transition-colors">
                      <Flag className="h-4 w-4" />
                      <span>Report</span>
                    </button>
                    <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 transition-colors">
                      <Share className="h-4 w-4" />
                      <span>Share</span>
                    </button>
                    {user && post.user_id === parseInt(user.id) && (
                      <>
                        <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 transition-colors">
                          <Edit className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-400 hover:bg-gray-800 transition-colors">
                          <Trash className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap break-words">{post.content}</div>
              </div>
              
              <div className="flex items-center gap-4 mt-6">
                <button className="flex items-center gap-1 text-gray-400 hover:text-purple-400 transition-colors">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{post.likes || 0}</span>
                </button>
                
                <button
                  onClick={() => {
                    setReplyContent(`@${post.user?.name} `);
                    replyFormRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1 text-gray-400 hover:text-purple-400 transition-colors"
                >
                  <Reply className="h-4 w-4" />
                  <span>Reply</span>
                </button>
                
                <button className="flex items-center gap-1 text-gray-400 hover:text-purple-400 transition-colors">
                  <Share className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </InfiniteScroll>
      
      {/* Reply form */}
      {onCreatePost && (
        <div className="mt-8 bg-gray-800 rounded-lg p-6" ref={replyFormRef}>
          <h3 className="text-lg font-semibold text-white mb-4">Post a Reply</h3>
          
          <form onSubmit={handleSubmitReply} className="space-y-4">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 min-h-[120px]"
              required
            />
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!replyContent.trim() || submitting}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};