import React, { useState } from 'react';
import { CommentItem, Comment } from './CommentItem';
import { CommentForm } from './CommentForm';
import { MessageSquare } from 'lucide-react';

interface CommentThreadProps {
  comments: Comment[];
  onAddComment: (content: string, parentId?: string) => void;
  onLikeComment: (commentId: string) => void;
  onUnlikeComment: (commentId: string) => void;
  isLoading?: boolean;
  error?: string;
  currentUserId?: string;
  userAvatar?: string;
  className?: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  onAddComment,
  onLikeComment,
  onUnlikeComment,
  isLoading = false,
  error,
  currentUserId,
  userAvatar,
  className = ''
}) => {
  const [sortBy, setSortBy] = useState<'top' | 'new' | 'controversial'>('top');
  
  // Sort comments based on selected sort option
  const sortedComments = [...comments].sort((a, b) => {
    switch (sortBy) {
      case 'top':
        return b.likes - a.likes;
      case 'new':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      case 'controversial':
        // This is a simplified version of "controversial" sorting
        // In a real app, you'd need a more complex algorithm
        return (b.replies.length + b.likes) - (a.replies.length + a.likes);
      default:
        return 0;
    }
  });
  
  // Only show top-level comments (no parentId)
  const topLevelComments = sortedComments.filter(comment => !comment.parentId);
  
  return (
    <div className={`bg-[#1a1a1b] rounded-md ${className}`}>
      {/* Comment Form */}
      <div className="mb-6">
        <CommentForm 
          onSubmit={(content) => onAddComment(content)}
          isLoading={isLoading}
          error={error}
          userAvatar={userAvatar}
        />
      </div>
      
      {/* Sort Options */}
      <div className="mb-4 border-b border-[#343536] pb-2">
        <div className="flex items-center gap-2 text-[#818384] text-sm">
          <MessageSquare className="h-4 w-4" />
          <span>{comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}</span>
          
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setSortBy('top')}
              className={`px-3 py-1 rounded-full text-xs ${
                sortBy === 'top' 
                  ? 'bg-[#343536] text-[#d7dadc]' 
                  : 'hover:bg-[#272729] text-[#818384]'
              } transition-colors`}
            >
              Top
            </button>
            <button
              onClick={() => setSortBy('new')}
              className={`px-3 py-1 rounded-full text-xs ${
                sortBy === 'new' 
                  ? 'bg-[#343536] text-[#d7dadc]' 
                  : 'hover:bg-[#272729] text-[#818384]'
              } transition-colors`}
            >
              New
            </button>
            <button
              onClick={() => setSortBy('controversial')}
              className={`px-3 py-1 rounded-full text-xs ${
                sortBy === 'controversial' 
                  ? 'bg-[#343536] text-[#d7dadc]' 
                  : 'hover:bg-[#272729] text-[#818384]'
              } transition-colors`}
            >
              Controversial
            </button>
          </div>
        </div>
      </div>
      
      {/* Comments List */}
      {topLevelComments.length > 0 ? (
        <div>
          {topLevelComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onLike={onLikeComment}
              onUnlike={onUnlikeComment}
              onReply={onAddComment}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <MessageSquare className="h-12 w-12 text-[#343536] mx-auto mb-3" />
          <p className="text-[#818384]">No comments yet. Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
};