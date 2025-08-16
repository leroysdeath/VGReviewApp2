import React, { useState } from 'react';
import { Heart, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';
import { CommentForm } from './CommentForm';
import { escapeHtml } from '../../utils/sanitize';

export interface Comment {
  id: string;
  content: string;
  userId: string;
  username: string;
  userAvatar?: string;
  timestamp: Date;
  likes: number;
  replies: Comment[];
  parentId?: string;
  isLiked?: boolean;
}

interface CommentItemProps {
  comment: Comment;
  level?: number;
  maxDepth?: number;
  onLike: (commentId: string) => void;
  onUnlike: (commentId: string) => void;
  onReply: (parentId: string, content: string) => void;
  currentUserId?: string;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  level = 0,
  maxDepth = 6,
  onLike,
  onUnlike,
  onReply,
  currentUserId
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  
  const handleLikeToggle = () => {
    if (comment.isLiked) {
      onUnlike(comment.id);
    } else {
      onLike(comment.id);
    }
  };
  
  const handleReply = (content: string) => {
    onReply(comment.id, content);
    setIsReplying(false);
  };
  
  const getUserInitial = (username: string): string => {
    return username.charAt(0).toUpperCase();
  };

  return (
    <div className="mb-4">
      <div 
        className="flex gap-3"
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {comment.userAvatar ? (
            <img
              src={comment.userAvatar}
              alt={comment.username}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#343536] flex items-center justify-center text-[#d7dadc] font-bold">
              {getUserInitial(comment.username)}
            </div>
          )}
        </div>
        
        {/* Comment Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-[#d7dadc]">{escapeHtml(comment.username)}</span>
            <span className="text-[#818384] text-sm">
              {formatRelativeTime(comment.timestamp)}
            </span>
          </div>
          
          <div className="text-[#d7dadc] mb-2 break-words">
            {escapeHtml(comment.content)}
          </div>
          
          {/* Comment Actions */}
          <div className="flex items-center gap-4 text-[#818384] text-sm">
            <button 
              onClick={handleLikeToggle}
              className="flex items-center gap-1 hover:text-[#d7dadc] transition-colors"
              aria-label={comment.isLiked ? "Unlike comment" : "Like comment"}
            >
              <Heart 
                className={`h-4 w-4 ${comment.isLiked ? 'fill-[#ff4500] text-[#ff4500]' : ''}`} 
              />
              <span>{comment.likes}</span>
            </button>
            
            <button 
              onClick={() => setIsReplying(!isReplying)}
              className="flex items-center gap-1 hover:text-[#d7dadc] transition-colors"
              aria-label="Reply to comment"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Reply</span>
            </button>
            
            {comment.replies.length > 0 && (
              <button 
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 hover:text-[#d7dadc] transition-colors"
                aria-label={showReplies ? "Hide replies" : "Show replies"}
              >
                {showReplies ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span>{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
              </button>
            )}
          </div>
          
          {/* Reply Form */}
          {isReplying && (
            <div className="mt-3">
              <CommentForm 
                onSubmit={handleReply} 
                onCancel={() => setIsReplying(false)}
                placeholder={`Reply to ${comment.username}...`}
                submitLabel="Reply"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Nested Replies */}
      {showReplies && comment.replies.length > 0 && level < maxDepth && (
        <div className="mt-3 border-l-2 border-[#343536] pl-2">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              level={level + 1}
              maxDepth={maxDepth}
              onLike={onLike}
              onUnlike={onUnlike}
              onReply={onReply}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
      
      {/* Show "View more replies" button if max depth reached */}
      {showReplies && comment.replies.length > 0 && level >= maxDepth && (
        <div 
          className="mt-3 text-[#818384] text-sm hover:text-[#d7dadc] cursor-pointer"
          style={{ marginLeft: `${(level + 1) * 24}px` }}
        >
          Continue this thread →
        </div>
      )}
    </div>
  );
};