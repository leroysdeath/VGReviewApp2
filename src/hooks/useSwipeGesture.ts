import { useRef, useEffect } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  threshold?: number;
  enabled?: boolean;
}

export const useSwipeGesture = (options: SwipeGestureOptions) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeEnd,
    threshold = 50,
    enabled = true,
  } = options;

  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const isTracking = useRef(false);

  const handleTouchStart = (e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    currentX.current = touch.clientX;
    currentY.current = touch.clientY;
    isTracking.current = true;
    
    onSwipeStart?.();
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!enabled || !isTracking.current) return;
    
    const touch = e.touches[0];
    currentX.current = touch.clientX;
    currentY.current = touch.clientY;
  };

  const handleTouchEnd = () => {
    if (!enabled || !isTracking.current) return;
    
    const deltaX = currentX.current - startX.current;
    const deltaY = currentY.current - startY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // Determine if this is a valid swipe
    if (Math.max(absDeltaX, absDeltaY) > threshold) {
      // Horizontal swipe
      if (absDeltaX > absDeltaY) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
      // Vertical swipe
      else {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }
    
    isTracking.current = false;
    onSwipeEnd?.();
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (!enabled) return;
    
    startX.current = e.clientX;
    startY.current = e.clientY;
    currentX.current = e.clientX;
    currentY.current = e.clientY;
    isTracking.current = true;
    
    onSwipeStart?.();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!enabled || !isTracking.current) return;
    
    currentX.current = e.clientX;
    currentY.current = e.clientY;
  };

  const handleMouseUp = () => {
    if (!enabled || !isTracking.current) return;
    
    const deltaX = currentX.current - startX.current;
    const deltaY = currentY.current - startY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    if (Math.max(absDeltaX, absDeltaY) > threshold) {
      if (absDeltaX > absDeltaY) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }
    
    isTracking.current = false;
    onSwipeEnd?.();
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
  };
};