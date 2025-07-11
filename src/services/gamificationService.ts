import { supabase } from './supabase';
import { 
  UserLevel, 
  Achievement, 
  UserAchievement, 
  Challenge, 
  UserChallenge,
  Leaderboard,
  LeaderboardEntry,
  UserStreak,
  Reward,
  UserReward,
  AchievementWithProgress,
  ChallengeWithProgress,
  LeaderboardWithEntries
} from '../types/gamification';
import { formatDistanceToNow, formatDistance, isPast, isToday } from 'date-fns';

class GamificationService {
  // User Level Methods
  async getUserLevel(userId: number): Promise<UserLevel | null> {
    try {
      const { data, error } = await supabase
        .from('user_level')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user level:', error);
      return null;
    }
  }

  async addUserXP(userId: number, xpAmount: number): Promise<UserLevel | null> {
    try {
      // Call the add_user_xp function
      const { error } = await supabase.rpc('add_user_xp', {
        p_user_id: userId,
        p_xp_amount: xpAmount
      });
      
      if (error) throw error;
      
      // Get updated user level
      return await this.getUserLevel(userId);
    } catch (error) {
      console.error('Error adding user XP:', error);
      return null;
    }
  }

  // Achievement Methods
  async getAchievements(category?: string): Promise<Achievement[]> {
    try {
      let query = supabase
        .from('achievement')
        .select('*')
        .order('id');
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }
  }

  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievement')
        .select(`
          *,
          achievement(*)
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }
  }

  async getUserAchievementsWithProgress(userId: number): Promise<AchievementWithProgress[]> {
    try {
      // Get all achievements
      const achievements = await this.getAchievements();
      
      // Get user's achievements
      const userAchievements = await this.getUserAchievements(userId);
      
      // Combine data
      return achievements.map(achievement => {
        const userAchievement = userAchievements.find(ua => 
          ua.achievement_id === achievement.id
        );
        
        return {
          ...achievement,
          progress: userAchievement?.progress || 0,
          is_completed: userAchievement?.is_completed || false,
          completed_at: userAchievement?.completed_at || null,
          is_showcased: userAchievement?.is_showcased || false
        };
      });
    } catch (error) {
      console.error('Error fetching user achievements with progress:', error);
      return [];
    }
  }

  async toggleShowcaseAchievement(userId: number, achievementId: number, showcase: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_achievement')
        .update({ is_showcased: showcase })
        .eq('user_id', userId)
        .eq('achievement_id', achievementId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error toggling showcase achievement:', error);
      return false;
    }
  }

  // Challenge Methods
  async getActiveChallenges(): Promise<Challenge[]> {
    try {
      const { data, error } = await supabase
        .from('challenge')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('challenge_type', { ascending: true })
        .order('end_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active challenges:', error);
      return [];
    }
  }

  async getUserChallenges(userId: number): Promise<UserChallenge[]> {
    try {
      const { data, error } = await supabase
        .from('user_challenge')
        .select(`
          *,
          challenge(*)
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user challenges:', error);
      return [];
    }
  }

  async getUserChallengesWithProgress(userId: number): Promise<ChallengeWithProgress[]> {
    try {
      // Get active challenges
      const challenges = await this.getActiveChallenges();
      
      // Get user's challenges
      const userChallenges = await this.getUserChallenges(userId);
      
      // Combine data
      return challenges.map(challenge => {
        const userChallenge = userChallenges.find(uc => 
          uc.challenge_id === challenge.id
        );
        
        const progress = userChallenge?.progress || 0;
        const percentComplete = challenge.requirement_count > 0 
          ? Math.min(100, Math.round((progress / challenge.requirement_count) * 100)) 
          : 0;
        
        // Calculate time remaining
        const endDate = new Date(challenge.end_date);
        const timeRemaining = isPast(endDate) 
          ? 'Expired' 
          : formatDistanceToNow(endDate, { addSuffix: true });
        
        return {
          ...challenge,
          progress: progress,
          is_completed: userChallenge?.is_completed || false,
          completed_at: userChallenge?.completed_at || null,
          reward_claimed: userChallenge?.reward_claimed || false,
          timeRemaining,
          percentComplete
        };
      });
    } catch (error) {
      console.error('Error fetching user challenges with progress:', error);
      return [];
    }
  }

  async claimChallengeReward(userId: number, challengeId: number): Promise<boolean> {
    try {
      // Get challenge info
      const { data: challenge, error: challengeError } = await supabase
        .from('challenge')
        .select('*')
        .eq('id', challengeId)
        .single();
      
      if (challengeError) throw challengeError;
      
      // Update user challenge
      const { error: updateError } = await supabase
        .from('user_challenge')
        .update({ reward_claimed: true })
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .eq('is_completed', true)
        .eq('reward_claimed', false);
      
      if (updateError) throw updateError;
      
      // Add XP to user
      await this.addUserXP(userId, challenge.xp_reward);
      
      return true;
    } catch (error) {
      console.error('Error claiming challenge reward:', error);
      return false;
    }
  }

  // Leaderboard Methods
  async getLeaderboards(): Promise<Leaderboard[]> {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('is_active', true)
        .order('id');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
      return [];
    }
  }

  async getLeaderboardEntries(leaderboardId: number, limit = 10): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from('leaderboard_entry')
        .select(`
          *,
          user:user_id(id, name, picurl)
        `)
        .eq('leaderboard_id', leaderboardId)
        .order('rank', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching leaderboard entries:', error);
      return [];
    }
  }

  async getLeaderboardWithEntries(leaderboardId: number, userId?: number, limit = 10): Promise<LeaderboardWithEntries | null> {
    try {
      // Get leaderboard info
      const { data: leaderboard, error: leaderboardError } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('id', leaderboardId)
        .single();
      
      if (leaderboardError) throw leaderboardError;
      
      // Get leaderboard entries
      const entries = await this.getLeaderboardEntries(leaderboardId, limit);
      
      // Get user's rank and score if userId provided
      let userRank, userScore;
      if (userId) {
        const { data: userEntry, error: userEntryError } = await supabase
          .from('leaderboard_entry')
          .select('rank, score')
          .eq('leaderboard_id', leaderboardId)
          .eq('user_id', userId)
          .single();
        
        if (!userEntryError && userEntry) {
          userRank = userEntry.rank;
          userScore = userEntry.score;
        }
      }
      
      return {
        ...leaderboard,
        entries,
        userRank,
        userScore
      };
    } catch (error) {
      console.error('Error fetching leaderboard with entries:', error);
      return null;
    }
  }

  async getAllLeaderboardsWithEntries(userId?: number, limit = 10): Promise<LeaderboardWithEntries[]> {
    try {
      const leaderboards = await this.getLeaderboards();
      const leaderboardsWithEntries = await Promise.all(
        leaderboards.map(leaderboard => 
          this.getLeaderboardWithEntries(leaderboard.id, userId, limit)
        )
      );
      
      return leaderboardsWithEntries.filter(Boolean) as LeaderboardWithEntries[];
    } catch (error) {
      console.error('Error fetching all leaderboards with entries:', error);
      return [];
    }
  }

  // Streak Methods
  async getUserStreaks(userId: number): Promise<UserStreak[]> {
    try {
      const { data, error } = await supabase
        .from('user_streak')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user streaks:', error);
      return [];
    }
  }

  async updateUserStreak(userId: number, streakType: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_user_streak', {
        p_user_id: userId,
        p_streak_type: streakType
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating user streak:', error);
      return false;
    }
  }

  // Reward Methods
  async getUserRewards(userId: number): Promise<UserReward[]> {
    try {
      const { data, error } = await supabase
        .from('user_reward')
        .select(`
          *,
          reward(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user rewards:', error);
      return [];
    }
  }

  // Helper Methods
  formatTimeRemaining(endDate: string): string {
    const end = new Date(endDate);
    if (isPast(end)) return 'Expired';
    
    if (isToday(end)) {
      return formatDistanceToNow(end, { addSuffix: true });
    }
    
    return formatDistance(new Date(), end, { addSuffix: true });
  }

  calculateLevelProgress(xp: number, xpToNextLevel: number): number {
    return Math.min(100, Math.round((xp / xpToNextLevel) * 100));
  }

  calculateRequiredXP(level: number): number {
    // Base XP is 100, increases by 20% each level
    return Math.floor(100 * Math.pow(1.2, level - 1));
  }
}

export const gamificationService = new GamificationService();