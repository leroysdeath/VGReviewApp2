import React, { useState } from 'react';
import { User, Loader2, AlertCircle } from 'lucide-react';

interface CommentFormProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  initialValue?: string;
  isLoading?: boolean;
  error?: string;
  userAvatar?: string;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  onCancel,
  placeholder = "What are your thoughts?",
  submitLabel = "Comment",
  initialValue = "",
  isLoading = false,
  error,
  userAvatar
}) => {
  const [content, setContent] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (content.trim().length === 0) return;
    
    onSubmit(content);
    if (!isLoading) {
      setContent("");
    }
  };
  
  const charCount = content.length;
  const maxChars = 1000;
  const isOverLimit = charCount > maxChars;
  const charsRemaining = maxChars - charCount;
  
  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="flex gap-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="Your avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#343536] flex items-center justify-center text-[#d7dadc]">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>
        
        {/* Comment Input */}
        <div className="flex-1">
          <div className={`relative border ${isFocused ? 'border-[#d7dadc]' : 'border-[#343536]'} rounded-md transition-colors`}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="w-full px-3 py-2 bg-[#1a1a1b] text-[#d7dadc] rounded-md focus:outline-none resize-y min-h-[100px]"
              disabled={isLoading}
              aria-label="Comment text"
              maxLength={maxChars}
            />
            
            {/* Character counter */}
            <div className={`absolute bottom-2 right-2 text-xs ${isOverLimit ? 'text-red-500' : 'text-[#818384]'}`}>
              {charsRemaining} characters remaining
            </div>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="mt-2 flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex justify-end gap-2 mt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-transparent border border-[#343536] text-[#d7dadc] rounded-full hover:border-[#818384] transition-colors text-sm"
                disabled={isLoading}
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={isLoading || content.trim().length === 0 || isOverLimit}
              className="px-4 py-2 bg-[#d7dadc] text-[#1a1a1b] rounded-full hover:bg-white transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};