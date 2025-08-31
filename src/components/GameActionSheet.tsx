import React, { useState, useEffect, useRef } from 'react';
import { Gift, BookOpen, Play, CheckCircle, ScrollText, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface GameActionSheetProps {
  // State props
  isInWishlist: boolean;
  isInCollection: boolean;
  isStarted: boolean;
  isCompleted: boolean;
  userHasReviewed: boolean;
  wishlistLoading: boolean;
  collectionLoading: boolean;
  progressLoading: boolean;
  userReviewLoading: boolean;
  
  // Action handlers
  onToggleWishlist: () => void;
  onToggleCollection: () => void;
  onMarkStarted: () => void;
  onMarkCompleted: () => void;
  onWriteReview: () => void;
}

export const GameActionSheet: React.FC<GameActionSheetProps> = ({
  isInWishlist,
  isInCollection,
  isStarted,
  isCompleted,
  userHasReviewed,
  wishlistLoading,
  collectionLoading,
  progressLoading,
  userReviewLoading,
  onToggleWishlist,
  onToggleCollection,
  onMarkStarted,
  onMarkCompleted,
  onWriteReview,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Handle swipe down to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isSwipeDown = distance < -50;
    
    if (isSwipeDown) {
      handleClose();
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsAnimating(true);
    // Prevent body scroll when sheet is open
    document.body.style.overflow = 'hidden';
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsOpen(false);
      // Restore body scroll
      document.body.style.overflow = '';
    }, 300);
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Determine which icons should be visible/highlighted
  const showWishlist = !isInCollection && !isStarted && !isCompleted;
  const showCollection = !isStarted && !isCompleted;

  // Icon strip component
  const IconStrip = () => (
    <button
      onClick={handleOpen}
      className="md:hidden w-full flex items-center justify-between px-4 py-3 bg-gray-800/50 backdrop-blur-sm rounded-xl hover:bg-gray-700/50 transition-all active:scale-[0.98]"
      aria-label="Game actions menu"
    >
      <div className="flex items-center gap-3">
        {/* Wishlist Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isInWishlist && showWishlist 
            ? 'bg-red-600' 
            : showWishlist 
            ? 'border border-red-500 bg-gray-900/80 backdrop-blur-md' 
            : 'bg-gray-800 opacity-30'
        }`}>
          <Gift className={`h-5 w-5 ${
            isInWishlist && showWishlist 
              ? 'text-white' 
              : showWishlist 
              ? 'text-red-500' 
              : 'text-white'
          }`} />
        </div>

        {/* Collection Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isInCollection && showCollection
            ? 'bg-orange-600'
            : showCollection
            ? 'border border-orange-500 bg-gray-900/80 backdrop-blur-md'
            : 'bg-gray-800 opacity-30'
        }`}>
          <BookOpen className={`h-5 w-5 ${
            isInCollection && showCollection
              ? 'text-white'
              : showCollection
              ? 'text-orange-500'
              : 'text-white'
          }`} />
        </div>

        {/* Started Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isStarted 
            ? 'bg-blue-600' 
            : 'border border-blue-500 bg-gray-900/80 backdrop-blur-md'
        }`}>
          <Play className={`h-5 w-5 ${
            isStarted ? 'text-white' : 'text-blue-500'
          }`} />
        </div>

        {/* Finished Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isCompleted 
            ? 'bg-green-600' 
            : 'border border-green-500 bg-gray-900/80 backdrop-blur-md'
        }`}>
          <CheckCircle className={`h-5 w-5 ${
            isCompleted ? 'text-white' : 'text-green-500'
          }`} />
        </div>

        {/* Review Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          userHasReviewed 
            ? 'bg-purple-600' 
            : 'border border-purple-500 bg-gray-900/80 backdrop-blur-md'
        }`}>
          <ScrollText className={`h-5 w-5 ${
            userHasReviewed ? 'text-white' : 'text-purple-500'
          }`} />
        </div>
      </div>

      {/* Three dots */}
      <span className="text-gray-400 text-xl">...</span>
    </button>
  );

  // Bottom sheet component
  const BottomSheet = () => {
    if (!isOpen) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 md:hidden">
        {/* Backdrop with blur */}
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isAnimating ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleClose}
        />

        {/* Bottom Sheet */}
        <div
          ref={sheetRef}
          className={`absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl transition-transform duration-300 ${
            isAnimating ? 'translate-y-0' : 'translate-y-full'
          }`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-600 rounded-full" />
          </div>

          {/* Actions */}
          <div className="px-4 pb-6 space-y-2">
            {/* Write/Edit Review Button */}
            <button
              onClick={() => {
                onWriteReview();
                handleClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <span className="font-medium">
                {userReviewLoading ? 'Loading...' : userHasReviewed ? 'Edit Review' : 'Write Review'}
              </span>
              <ScrollText className="h-5 w-5" />
            </button>

            {/* Finished Button */}
            <button
              onClick={() => {
                onMarkCompleted();
                if (!isCompleted) handleClose();
              }}
              disabled={isCompleted || progressLoading}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                isCompleted
                  ? 'bg-green-600 text-white cursor-not-allowed'
                  : progressLoading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                  : 'border border-green-500 text-green-400 hover:bg-green-600/10'
              }`}
            >
              <span className="font-medium">
                {isCompleted ? 'Finished' : 'Mark as Finished'}
              </span>
              <CheckCircle className="h-5 w-5" />
            </button>

            {/* Started Button */}
            <button
              onClick={() => {
                onMarkStarted();
                if (!isStarted) handleClose();
              }}
              disabled={isStarted || progressLoading}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                isStarted
                  ? 'bg-blue-600 text-white cursor-not-allowed'
                  : progressLoading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                  : 'border border-blue-500 text-blue-400 hover:bg-blue-600/10'
              }`}
            >
              <span className="font-medium">
                {isStarted ? 'Started' : 'Mark as Started'}
              </span>
              <Play className="h-5 w-5" />
            </button>

            {/* Collection Button - Show if not started/finished */}
            {showCollection && (
              <button
                onClick={() => {
                  onToggleCollection();
                  if (!isInCollection) handleClose();
                }}
                disabled={collectionLoading}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  isInCollection
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'border border-orange-500 text-orange-400 hover:bg-orange-600/10'
                } ${collectionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="font-medium">
                  {collectionLoading ? (
                    'Loading...'
                  ) : isInCollection ? (
                    'In Collection'
                  ) : isInWishlist ? (
                    'Move to Collection'
                  ) : (
                    'Add to Collection'
                  )}
                </span>
                {collectionLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
                ) : (
                  <BookOpen className="h-5 w-5" />
                )}
              </button>
            )}

            {/* Wishlist Button - Show if not in collection and not started/finished */}
            {showWishlist && (
              <button
                onClick={() => {
                  onToggleWishlist();
                  if (!isInWishlist) handleClose();
                }}
                disabled={wishlistLoading}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  isInWishlist
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'border border-red-500 text-red-400 hover:bg-red-600/10'
                } ${wishlistLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="font-medium">
                  {wishlistLoading ? 'Loading...' : isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                </span>
                {wishlistLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
                ) : (
                  <Gift className="h-5 w-5" />
                )}
              </button>
            )}

            {/* Cancel Button */}
            <button
              onClick={handleClose}
              className="w-full flex items-center justify-center px-4 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium">Cancel</span>
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <IconStrip />
      <BottomSheet />
    </>
  );
};