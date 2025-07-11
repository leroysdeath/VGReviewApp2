import React, { useState, useEffect } from 'react';
import { GamificationNotification } from '../types/gamification';
import { AchievementUnlockAnimation } from './AchievementUnlockAnimation';
import { LevelUpAnimation } from './LevelUpAnimation';
import { ChallengeCard } from './ChallengeCard';
import { X } from 'lucide-react';

interface GamificationNotificationsProps {
  notifications: GamificationNotification[];
  onDismiss: (index: number) => void;
}

export const GamificationNotifications: React.FC<GamificationNotificationsProps> = ({
  notifications,
  onDismiss
}) => {
  const [currentNotification, setCurrentNotification] = useState<GamificationNotification | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  
  // Show the first notification when notifications change
  useEffect(() => {
    if (notifications.length > 0 && currentNotification === null) {
      setCurrentNotification(notifications[0]);
      setCurrentIndex(0);
    }
  }, [notifications, currentNotification]);
  
  // Handle notification close
  const handleClose = () => {
    if (currentIndex !== null) {
      onDismiss(currentIndex);
    }
    setCurrentNotification(null);
    setCurrentIndex(null);
  };
  
  // Render the appropriate notification component
  const renderNotification = () => {
    if (!currentNotification) return null;
    
    switch (currentNotification.type) {
      case 'achievement':
        return (
          <AchievementUnlockAnimation
            achievement={currentNotification.achievement}
            xpGained={currentNotification.xpGained}
            onClose={handleClose}
          />
        );
      case 'level_up':
        return (
          <LevelUpAnimation
            newLevel={currentNotification.newLevel}
            xpGained={currentNotification.xpGained}
            onClose={handleClose}
          />
        );
      case 'challenge':
        return (
          <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full animate-slide-up">
            <div className="relative">
              <button
                onClick={handleClose}
                className="absolute -top-2 -right-2 p-1 bg-gray-700 text-white rounded-full z-10 hover:bg-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <ChallengeCard
                challenge={currentNotification.challenge}
                className="shadow-xl"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  return renderNotification();
};