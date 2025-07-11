import { useState, useEffect, useCallback } from 'react';
import { gamificationService } from '../services/gamificationService';
import { 
  UserLevel, 
  AchievementWithProgress, 
  ChallengeWithProgress,
  LeaderboardWithEntries,
  UserStreak,
  UserReward,
  GamificationNotification
} from '../types/gamification';
import { useAuth } from './useAuth';

export const useGamification = () => {
  const { user } = useAuth();
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([]);
  const [leaderboards, setLeaderboards] = useState<LeaderboardWithEntries[]>([]);
  const [streaks, setStreaks] = useState<UserStreak[]>([]);
  const [rewards, setRewards] = useState<UserReward[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({
    level: false,
    achievements: false,
    challenges: false,
    leaderboards: false,
    streaks: false,
    rewards: false
  });
  const [notifications, setNotifications] = useState<GamificationNotification[]>([]);

  // Load user level
  const loadUserLevel = useCallback(async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, level: true }));
    try {
      const userId = parseInt(user.id);
      const level = await gamificationService.getUserLevel(userId);
      setUserLevel(level);
    } catch (error) {
      console.error('Error loading user level:', error);
    } finally {
      setLoading(prev => ({ ...prev, level: false }));
    }
  }, [user]);

  // Load achievements
  const loadAchievements = useCallback(async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, achievements: true }));
    try {
      const userId = parseInt(user.id);
      const achievementsWithProgress = await gamificationService.getUserAchievementsWithProgress(userId);
      setAchievements(achievementsWithProgress);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(prev => ({ ...prev, achievements: false }));
    }
  }, [user]);

  // Load challenges
  const loadChallenges = useCallback(async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, challenges: true }));
    try {
      const userId = parseInt(user.id);
      const challengesWithProgress = await gamificationService.getUserChallengesWithProgress(userId);
      setChallenges(challengesWithProgress);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(prev => ({ ...prev, challenges: false }));
    }
  }, [user]);

  // Load leaderboards
  const loadLeaderboards = useCallback(async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, leaderboards: true }));
    try {
      const userId = parseInt(user.id);
      const leaderboardsWithEntries = await gamificationService.getAllLeaderboardsWithEntries(userId);
      setLeaderboards(leaderboardsWithEntries);
    } catch (error) {
      console.error('Error loading leaderboards:', error);
    } finally {
      setLoading(prev => ({ ...prev, leaderboards: false }));
    }
  }, [user]);

  // Load streaks
  const loadStreaks = useCallback(async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, streaks: true }));
    try {
      const userId = parseInt(user.id);
      const userStreaks = await gamificationService.getUserStreaks(userId);
      setStreaks(userStreaks);
    } catch (error) {
      console.error('Error loading streaks:', error);
    } finally {
      setLoading(prev => ({ ...prev, streaks: false }));
    }
  }, [user]);

  // Load rewards
  const loadRewards = useCallback(async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, rewards: true }));
    try {
      const userId = parseInt(user.id);
      const userRewards = await gamificationService.getUserRewards(userId);
      setRewards(userRewards);
    } catch (error) {
      console.error('Error loading rewards:', error);
    } finally {
      setLoading(prev => ({ ...prev, rewards: false }));
    }
  }, [user]);

  // Update login streak
  const updateLoginStreak = useCallback(async () => {
    if (!user) return;
    
    try {
      const userId = parseInt(user.id);
      await gamificationService.updateUserStreak(userId, 'login');
      // Reload streaks after update
      await loadStreaks();
    } catch (error) {
      console.error('Error updating login streak:', error);
    }
  }, [user, loadStreaks]);

  // Claim challenge reward
  const claimChallengeReward = useCallback(async (challengeId: number) => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      const success = await gamificationService.claimChallengeReward(userId, challengeId);
      
      if (success) {
        // Reload challenges and user level
        await Promise.all([loadChallenges(), loadUserLevel()]);
        
        // Find the challenge to show notification
        const challenge = challenges.find(c => c.id === challengeId);
        if (challenge) {
          // Add notification
          setNotifications(prev => [
            ...prev,
            {
              type: 'challenge',
              challenge,
              xpGained: challenge.xp_reward
            }
          ]);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error claiming challenge reward:', error);
      return false;
    }
  }, [user, challenges, loadChallenges, loadUserLevel]);

  // Toggle showcase achievement
  const toggleShowcaseAchievement = useCallback(async (achievementId: number, showcase: boolean) => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      const success = await gamificationService.toggleShowcaseAchievement(userId, achievementId, showcase);
      
      if (success) {
        // Update local state
        setAchievements(prev => 
          prev.map(achievement => 
            achievement.id === achievementId
              ? { ...achievement, is_showcased: showcase }
              : achievement
          )
        );
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error toggling showcase achievement:', error);
      return false;
    }
  }, [user]);

  // Dismiss notification
  const dismissNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Load all data
  const loadAllData = useCallback(async () => {
    if (!user) return;
    
    await Promise.all([
      loadUserLevel(),
      loadAchievements(),
      loadChallenges(),
      loadLeaderboards(),
      loadStreaks(),
      loadRewards()
    ]);
    
    // Update login streak
    await updateLoginStreak();
  }, [
    user, 
    loadUserLevel, 
    loadAchievements, 
    loadChallenges, 
    loadLeaderboards, 
    loadStreaks, 
    loadRewards,
    updateLoginStreak
  ]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  // Get completed achievements
  const getCompletedAchievements = useCallback(() => {
    return achievements.filter(achievement => achievement.is_completed);
  }, [achievements]);

  // Get showcased achievements
  const getShowcasedAchievements = useCallback(() => {
    return achievements.filter(achievement => achievement.is_showcased);
  }, [achievements]);

  // Get active challenges
  const getActiveChallenges = useCallback(() => {
    return challenges.filter(challenge => 
      challenge.is_active && 
      !challenge.is_completed && 
      !isPast(new Date(challenge.end_date))
    );
  }, [challenges]);

  // Get completed challenges
  const getCompletedChallenges = useCallback(() => {
    return challenges.filter(challenge => 
      challenge.is_completed && !challenge.reward_claimed
    );
  }, [challenges]);

  // Calculate level progress
  const getLevelProgress = useCallback(() => {
    if (!userLevel) return 0;
    return gamificationService.calculateLevelProgress(userLevel.xp, userLevel.xp_to_next_level);
  }, [userLevel]);

  return {
    userLevel,
    achievements,
    challenges,
    leaderboards,
    streaks,
    rewards,
    loading,
    notifications,
    loadUserLevel,
    loadAchievements,
    loadChallenges,
    loadLeaderboards,
    loadStreaks,
    loadRewards,
    loadAllData,
    claimChallengeReward,
    toggleShowcaseAchievement,
    dismissNotification,
    getCompletedAchievements,
    getShowcasedAchievements,
    getActiveChallenges,
    getCompletedChallenges,
    getLevelProgress
  };
};