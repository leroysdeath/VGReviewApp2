import React, { useState } from 'react';
import { Heart, MessageSquare, ChevronDown, ChevronUp, Edit2, Trash2, Check, X } from 'lucide-react';
import { Comment } from '../services/reviewService';

interface ReviewInteractionsProps {
  reviewId: string;
  initialLikeCount: number;
  initialCommentCount: number;
  isLiked: boolean;
  onLike: () => void;
  onUnlike: () => void;
  comments: Comment[];
  onAddComment: (content: string, parentId?: number) => Promise<void>;
  onEditComment: (commentId: number, content: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  isLoadingComments: boolean;
  isLoadingLike: boolean;
  error?: string;
  className?: string;
  reviewAuthorId?: number;
  currentUserId?: number;
  disabled?: boolean;
}

export const ReviewInteractions: React.FC<ReviewInteractionsProps> = ({
  reviewId,
  initialLikeCount,
  initialCommentCount,
  isLiked,
  onLike,
  onUnlike,
  comments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  isLoadingComments,
  isLoadingLike,
  error,
  className = '',
  reviewAuthorId,
  currentUserId,
  disabled = false
}) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | undefined>();
  
  // Character limit for comments
  const MAX_CHARS = 500;
  const remainingChars = MAX_CHARS - commentText.length;
  const isOverLimit = remainingChars < 0;
  
  const handleLikeToggle = () => {
    if (disabled) {
      console.log('⚠️ Interactions disabled - waiting for user data to load');
      return;
    }
    if (isLiked) {
      onUnlike();
    } else {
      onLike();
    }
  };
  
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled) {
      console.log('⚠️ Interactions disabled - waiting for user data to load');
      setCommentError('Please wait for user data to load');
      return;
    }
    
    if (!commentText.trim() || isOverLimit) {
      return;
    }
    
    setIsSubmitting(true);
    setCommentError(undefined);
    
    try {
      await onAddComment(commentText);
      setCommentText('');
    } catch (err) {
      setCommentError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleComments = () => {
    setShowComments(!showComments);
    // Comments are already loaded in background, just toggle visibility
    console.log('📋 Toggling comments view, already loaded in background');
  };
  
  // Check if current user is the review author
  const isReviewAuthor = currentUserId && reviewAuthorId && currentUserId === reviewAuthorId;
  
  // Format relative time for comments
  const formatRelativeTime = (date: string): string => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - commentDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return diffMinutes === 0 ? 'just now' : `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Like and Comment Buttons */}
      <div className="flex items-center gap-6 text-gray-400">
        {/* Allow everyone to like, including the review author (self-liking) */}
        <button
          onClick={handleLikeToggle}
          disabled={isLoadingLike || disabled}
          className={`flex items-center gap-2 transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed text-gray-500' :
            isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-white'
          }`}
          aria-label={isLiked ? 'Unlike review' : 'Like review'}
          title={disabled ? 'Loading user data...' : isReviewAuthor ? 'You can like your own review!' : ''}
        >
          <Heart className={`h-5 w-5 transition-transform ${isLiked ? 'fill-current scale-110' : 'scale-100'}`} />
          <span>{initialLikeCount}</span>
        </button>
        
        <button
          onClick={toggleComments}
          className="flex items-center gap-2 hover:text-white transition-colors"
          aria-label={showComments ? 'Hide comments' : 'Show comments'}
          title={isLoadingComments && !showComments ? 'Loading comments...' : ''}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="relative">
            {initialCommentCount}
            {isLoadingComments && !showComments && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
            )}
          </span>
          {showComments ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>
      
      {/* Comments Section */}
      {showComments && (
        <div className="pt-2 border-t border-gray-700">
          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="mb-4">
            <div className="relative">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="What are your thoughts?"
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                  isOverLimit ? 'border-red-500' : 'border-gray-600'
                }`}
                rows={3}
                maxLength={MAX_CHARS}
                disabled={isSubmitting}
                aria-label="Add a comment"
              />
              <div className={`absolute bottom-2 right-2 text-xs ${
                isOverLimit ? 'text-red-500' : 'text-gray-400'
              }`}>
                {remainingChars} characters remaining
              </div>
            </div>
            
            {commentError && (
              <p className="mt-1 text-sm text-red-500">{commentError}</p>
            )}
            
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={isSubmitting || !commentText.trim() || isOverLimit || disabled}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={disabled ? 'Loading user data...' : ''}
              >
                {disabled ? 'Loading...' : isSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
          
          {/* Comments List */}
          {isLoadingComments ? (
            <div className="space-y-4">
              {/* Loading skeleton for comments */}
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-full mb-1"></div>
                      <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment} 
                  formatRelativeTime={formatRelativeTime}
                  currentUserId={currentUserId}
                  onEdit={onEditComment}
                  onDelete={onDeleteComment}
                />
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-gray-400">
              No comments yet. Be the first to share your thoughts!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  formatRelativeTime: (date: string) => string;
  currentUserId?: number;
  onEdit: (commentId: number, content: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  formatRelativeTime,
  currentUserId,
  onEdit,
  onDelete,
  level = 0 
}) => {
  const maxLevel = 5; // Maximum nesting level
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  // Check if current user can edit/delete this comment
  const canModify = currentUserId && comment.userId === currentUserId;
  
  const handleEdit = async () => {
    if (!editContent.trim()) {
      setEditError('Comment cannot be empty');
      return;
    }
    if (editContent.length > 500) {
      setEditError('Comment exceeds 500 characters');
      return;
    }
    
    try {
      setEditError(null);
      await onEdit(comment.id, editContent);
      setIsEditing(false);
    } catch (err) {
      setEditError('Failed to update comment');
    }
  };
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    try {
      setIsDeleting(true);
      await onDelete(comment.id);
    } catch (err) {
      setIsDeleting(false);
      console.error('Failed to delete comment:', err);
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
    setEditError(null);
  };
  
  return (
    <div className="comment-item" style={{ marginLeft: level > 0 ? `${level * 24}px` : '0' }}>
      <div className="flex gap-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {comment.user?.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt={`${comment.user.username || comment.user.name}'s avatar`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-gray-300 text-sm">
              {comment.user?.name.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>
        
        {/* Comment Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">{comment.user?.name || 'Anonymous'}</span>
            <span className="text-gray-400 text-xs">{formatRelativeTime(comment.createdAt)}</span>
            {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
              <span className="text-gray-500 text-xs italic">(edited)</span>
            )}
          </div>
          
          {isEditing ? (
            <div className="mb-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                rows={3}
                maxLength={500}
                autoFocus
              />
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs ${editContent.length > 500 ? 'text-red-500' : 'text-gray-400'}`}>
                  {500 - editContent.length} characters remaining
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors flex items-center justify-center"
                    disabled={!editContent.trim() || editContent.length > 500}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {editError && (
                <p className="text-red-500 text-xs mt-1">{editError}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-300 text-sm mb-2">{comment.content}</p>
          )}
          
          {/* Comment Actions */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <button className="hover:text-white transition-colors">
              Reply
            </button>
            {canModify && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </>
            )}
          </div>
          
          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && level < maxLevel && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  formatRelativeTime={formatRelativeTime}
                  currentUserId={currentUserId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  level={level + 1}
                />
              ))}
            </div>
          )}
          
          {/* "Continue thread" for deeply nested comments */}
          {comment.replies && comment.replies.length > 0 && level >= maxLevel && (
            <div className="mt-2 text-sm text-purple-400 hover:text-purple-300 cursor-pointer">
              Continue this thread →
            </div>
          )}
        </div>
      </div>
    </div>
  );
};