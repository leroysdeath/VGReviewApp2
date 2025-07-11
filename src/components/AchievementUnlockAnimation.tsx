import React, { useState, useEffect } from 'react';
import { Achievement } from '../types/gamification';
import { Award, Star, X } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

interface AchievementUnlockAnimationProps {
  achievement: Achievement;
  xpGained: number;
  onClose: () => void;
  autoCloseDelay?: number;
}

export const AchievementUnlockAnimation: React.FC<AchievementUnlockAnimationProps> = ({
  achievement,
  xpGained,
  onClose,
  autoCloseDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  // Handle keyboard navigation
  useKeyboardNavigation({
    onEscape: handleClose,
    onEnter: handleClose,
    onSpace: handleClose,
    enabled: isVisible
  });
  
  // Show animation with a slight delay for better effect
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
    return () => clearTimeout(showTimer);
  }, []);
  
  // Auto-close after delay
  useEffect(() => {
    if (!isVisible) return;
    
    const closeTimer = setTimeout(() => {
      handleClose();
    }, autoCloseDelay);
    
    return () => clearTimeout(closeTimer);
  }, [isVisible, autoCloseDelay]);
  
  // Handle close with animation
  function handleClose() {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 500);
  }
  
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${isLeaving ? 'opacity-0' : ''}`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      
      {/* Achievement card */}
      <div 
        className={`relative bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl transition-all duration-500 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-10'
        } ${isLeaving ? 'scale-90 translate-y-10' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti animation (CSS-only) */}
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div 
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                backgroundColor: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${Math.random() * 2 + 3}s`
              }}
            ></div>
          ))}
        </div>
        
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* Achievement unlocked text */}
        <div className="text-center mb-4">
          <div className="inline-block bg-game-purple text-white px-3 py-1 rounded-full text-sm font-medium mb-2 animate-pulse">
            Achievement Unlocked!
          </div>
          <h2 className="text-2xl font-bold text-white">{achievement.name}</h2>
        </div>
        
        {/* Achievement icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-game-purple rounded-full animate-ping opacity-20"></div>
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: `${achievement.badge_color}20` }}>
              {achievement.icon_url ? (
                <LazyImage
                  src={achievement.icon_url}
                  alt={achievement.name}
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <Award className="h-12 w-12" style={{ color: achievement.badge_color }} />
              )}
            </div>
            
            {/* Animated rings */}
            <div className="absolute inset-0 border-2 rounded-full animate-ping-slow opacity-30" style={{ borderColor: achievement.badge_color }}></div>
            <div className="absolute inset-0 border-4 rounded-full animate-ping-slower opacity-20" style={{ borderColor: achievement.badge_color }}></div>
          </div>
        </div>
        
        {/* Achievement description */}
        <p className="text-gray-300 text-center mb-4">{achievement.description}</p>
        
        {/* XP reward */}
        <div className="flex items-center justify-center gap-2 text-yellow-400 font-medium mb-6 animate-bounce-gentle">
          <Star className="h-5 w-5 fill-current" />
          <span>+{xpGained} XP</span>
        </div>
        
        {/* Continue button */}
        <button
          onClick={handleClose}
          className="w-full py-3 bg-game-purple text-white rounded-lg hover:bg-game-purple/90 transition-colors font-medium"
        >
          Continue
        </button>
      </div>
      
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .confetti-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        
        .confetti {
          position: absolute;
          top: -20px;
          animation: confetti-fall linear forwards;
        }
        
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            opacity: 0.2;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        @keyframes ping-slower {
          0% {
            transform: scale(1);
            opacity: 0.2;
          }
          50% {
            opacity: 0.1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .animate-ping-slower {
          animation: ping-slower 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        @keyframes bounce-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};