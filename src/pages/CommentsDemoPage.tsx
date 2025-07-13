import React, { useState } from 'react';
import { CommentThread } from '../components/comments/CommentThread';
import { Comment } from '../components/comments/CommentItem';

// Sample comment data
const initialComments: Comment[] = [
  {
    id: '1',
    content: 'This game is absolutely incredible. The open world design and attention to detail are unmatched. I've spent over 100 hours exploring and still haven't seen everything.',
    userId: 'user1',
    username: 'GameExplorer',
    userAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    likes: 24,
    isLiked: false,
    replies: [
      {
        id: '2',
        content: 'I agree! Have you found the hidden cave system in the northern mountains? There's an amazing secret boss there.',
        userId: 'user2',
        username: 'RPGFanatic',
        userAvatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        likes: 8,
        isLiked: true,
        replies: [
          {
            id: '3',
            content: 'Thanks for the tip! I'll check it out tonight. Any recommended level before attempting it?',
            userId: 'user1',
            username: 'GameExplorer',
            userAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
            timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            likes: 3,
            isLiked: false,
            replies: [],
            parentId: '2'
          }
        ],
        parentId: '1'
      },
      {
        id: '4',
        content: 'The combat system could use some work though. It feels a bit clunky compared to other games in the genre.',
        userId: 'user3',
        username: 'CriticalGamer',
        timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        likes: 2,
        isLiked: false,
        replies: [],
        parentId: '1'
      }
    ]
  },
  {
    id: '5',
    content: 'The story is phenomenal. I wasn't expecting such an emotional journey. The character development throughout the game is some of the best I've seen in years.',
    userId: 'user4',
    username: 'StoryLover',
    userAvatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    likes: 42,
    isLiked: true,
    replies: []
  },
  {
    id: '6',
    content: 'Does anyone know if the DLC is worth buying? I finished the main game and I'm looking for more content.',
    userId: 'user5',
    username: 'CasualGamer',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    likes: 7,
    isLiked: false,
    replies: [
      {
        id: '7',
        content: 'Absolutely! The DLC adds about 20 hours of gameplay and introduces some really cool new mechanics. Definitely worth the price.',
        userId: 'user6',
        username: 'DLCEnthusiast',
        userAvatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
        timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
        likes: 15,
        isLiked: false,
        replies: [],
        parentId: '6'
      }
    ]
  },
  {
    id: '8',
    content: 'The graphics are stunning on next-gen consoles. I'm playing on PS5 and the ray tracing effects are mind-blowing.',
    userId: 'user7',
    username: 'TechGeek',
    userAvatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    likes: 31,
    isLiked: false,
    replies: []
  }
];

export const CommentsDemoPage: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  
  // Current user info (in a real app, this would come from auth context)
  const currentUser = {
    id: 'current-user',
    username: 'CurrentUser',
    avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150'
  };
  
  // Helper function to find a comment by ID (including nested replies)
  const findCommentById = (commentId: string, commentsList: Comment[]): Comment | undefined => {
    for (const comment of commentsList) {
      if (comment.id === commentId) {
        return comment;
      }
      
      if (comment.replies.length > 0) {
        const found = findCommentById(commentId, comment.replies);
        if (found) return found;
      }
    }
    
    return undefined;
  };
  
  // Helper function to add a reply to a comment
  const addReplyToComment = (
    parentId: string,
    newReply: Comment,
    commentsList: Comment[]
  ): Comment[] => {
    return commentsList.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...comment.replies, newReply]
        };
      }
      
      if (comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReplyToComment(parentId, newReply, comment.replies)
        };
      }
      
      return comment;
    });
  };
  
  // Add a new comment or reply
  const handleAddComment = (content: string, parentId?: string) => {
    setIsLoading(true);
    setError(undefined);
    
    // Simulate API call delay
    setTimeout(() => {
      try {
        const newComment: Comment = {
          id: `comment-${Date.now()}`,
          content,
          userId: currentUser.id,
          username: currentUser.username,
          userAvatar: currentUser.avatar,
          timestamp: new Date(),
          likes: 0,
          isLiked: false,
          replies: [],
          parentId
        };
        
        if (parentId) {
          // Add reply to existing comment
          setComments(prevComments => 
            addReplyToComment(parentId, newComment, prevComments)
          );
        } else {
          // Add new top-level comment
          setComments(prevComments => [newComment, ...prevComments]);
        }
        
        setIsLoading(false);
      } catch (err) {
        setError('Failed to add comment. Please try again.');
        setIsLoading(false);
      }
    }, 1000);
  };
  
  // Like a comment
  const handleLikeComment = (commentId: string) => {
    setComments(prevComments => {
      const updateLikes = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              likes: comment.likes + 1,
              isLiked: true
            };
          }
          
          if (comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateLikes(comment.replies)
            };
          }
          
          return comment;
        });
      };
      
      return updateLikes(prevComments);
    });
  };
  
  // Unlike a comment
  const handleUnlikeComment = (commentId: string) => {
    setComments(prevComments => {
      const updateLikes = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              likes: Math.max(0, comment.likes - 1),
              isLiked: false
            };
          }
          
          if (comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateLikes(comment.replies)
            };
          }
          
          return comment;
        });
      };
      
      return updateLikes(prevComments);
    });
  };
  
  // Simulate error
  const simulateError = () => {
    setError('This is a simulated error message. In a real application, this would show actual error details.');
  };
  
  // Clear error
  const clearError = () => {
    setError(undefined);
  };
  
  // Add test comment
  const addTestComment = () => {
    handleAddComment('This is a test comment added through the demo controls.');
  };
  
  return (
    <div className="min-h-screen bg-[#030303] py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#d7dadc] mb-4">Reddit-Style Comments</h1>
          <p className="text-[#818384] mb-6">
            A comment system with nested replies, voting, and a familiar interface.
          </p>
          
          {/* Demo Controls */}
          <div className="bg-[#1a1a1b] border border-[#343536] rounded-md p-4 mb-6">
            <h2 className="text-[#d7dadc] font-medium mb-3">Demo Controls</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={addTestComment}
                className="px-4 py-2 bg-[#d7dadc] text-[#1a1a1b] rounded-full hover:bg-white transition-colors text-sm"
              >
                Add Test Comment
              </button>
              <button
                onClick={simulateError}
                className="px-4 py-2 bg-[#ff4500] text-white rounded-full hover:bg-[#ff5722] transition-colors text-sm"
              >
                Simulate Error
              </button>
              {error && (
                <button
                  onClick={clearError}
                  className="px-4 py-2 bg-[#0079d3] text-white rounded-full hover:bg-[#0288d1] transition-colors text-sm"
                >
                  Clear Error
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Comment Thread */}
        <div className="bg-[#1a1a1b] border border-[#343536] rounded-md p-6">
          <CommentThread
            comments={comments}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
            onUnlikeComment={handleUnlikeComment}
            isLoading={isLoading}
            error={error}
            currentUserId={currentUser.id}
            userAvatar={currentUser.avatar}
          />
        </div>
        
        {/* Component Usage */}
        <div className="mt-12 bg-[#1a1a1b] border border-[#343536] rounded-md p-6">
          <h2 className="text-xl font-bold text-[#d7dadc] mb-4">Component Usage</h2>
          <pre className="bg-[#030303] p-4 rounded-md overflow-x-auto text-sm text-[#d7dadc]">
{`import { CommentThread } from '../components/comments/CommentThread';

// In your component:
<CommentThread
  comments={comments}
  onAddComment={(content, parentId) => {
    // Handle adding comment/reply
  }}
  onLikeComment={(commentId) => {
    // Handle liking comment
  }}
  onUnlikeComment={(commentId) => {
    // Handle unliking comment
  }}
  isLoading={false}
  error={undefined}
  currentUserId="current-user-id"
  userAvatar="current-user-avatar.jpg"
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
};