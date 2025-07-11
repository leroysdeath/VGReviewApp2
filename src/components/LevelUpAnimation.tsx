import React, { useState, useEffect } from 'react';
import { Trophy, Star, Zap, X } from 'lucide-react';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

interface LevelUpAnimationProps {
  newLevel: number;
  xpGained: number;
  onClose: () => void;
  autoCloseDelay?: number;
}

export const LevelUpAnimation: React.FC<LevelUpAnimationProps> = ({
  newLevel,
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
      
      {/* Level up card */}
      <div 
        className={`relative bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl transition-all duration-500 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-10'
        } ${isLeaving ? 'scale-90 translate-y-10' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Particle effects */}
        <div className="particles-container">
          {Array.from({ length: 30 }).map((_, i) => (
            <div 
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                backgroundColor: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 2 + 2}s`
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
        
        {/* Level up text */}
        <div className="text-center mb-6">
          <div className="inline-block bg-game-purple text-white px-4 py-2 rounded-full text-lg font-bold mb-3 animate-pulse">
            Level Up!
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            You reached Level {newLevel}!
          </h2>
          <p className="text-gray-300">
            Congratulations on your progress! Keep up the great work.
          </p>
        </div>
        
        {/* Level badge */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-game-purple rounded-full animate-ping opacity-20"></div>
            <div className="relative w-28 h-28 bg-gradient-to-br from-game-purple to-game-blue rounded-full flex items-center justify-center">
              <div className="text-3xl font-bold text-white">{newLevel}</div>
            </div>
            
            {/* Animated rays */}
            <div className="absolute inset-0 rays-animation"></div>
          </div>
        </div>
        
        {/* Rewards */}
        <div className="bg-gray-750 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span>Rewards Earned</span>
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" />
                <span className="text-gray-300">XP Bonus</span>
              </div>
              <span className="text-white font-medium">+{xpGained} XP</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-game-purple" />
                <span className="text-gray-300">New Feature Unlocked</span>
              </div>
              <span className="text-white font-medium">Profile Themes</span>
            </div>
          </div>
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
        @keyframes particle-rise {
          0% {
            transform: translateY(20px) scale(0);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }
        
        .particles-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }
        
        .particle {
          position: absolute;
          bottom: 0;
          border-radius: 50%;
          animation: particle-rise linear infinite;
        }
        
        @keyframes rays {
          0% {
            box-shadow: 0 0 0 0px rgba(99, 102, 241, 0.3),
                        0 0 0 10px rgba(99, 102, 241, 0.2),
                        0 0 0 20px rgba(99, 102, 241, 0.1);
          }
          100% {
            box-shadow: 0 0 0 10px rgba(99, 102, 241, 0.3),
                        0 0 0 20px rgba(99, 102, 241, 0.2),
                        0 0 0 30px rgba(99, 102, 241, 0);
          }
        }
        
        .rays-animation {
          border-radius: 50%;
          animation: rays 2s ease-out infinite;
        }
      `}</style>
    </div>
  );
};