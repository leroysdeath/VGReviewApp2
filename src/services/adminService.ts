import { supabase } from './supabase';

export interface DashboardMetrics {
  totalUsers: number;
  referralUsers: number;
  organicUsers: number;
  referralPercentage: number;
  totalRevenue: number;
  codeMetrics: CodeMetrics[];
  conversionFunnel: FunnelStage[];
  lastUpdated: string;
}

export interface CodeMetrics {
  code: string;
  ownerName: string;
  signups: number;
  percentageOfReferrals: number;
  emailVerified: number;
  profileCompleted: number;
  firstReview: number;
  paidConversions: number;
  revenue: number;
  conversionRate: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

export interface UserDetail {
  id: number;
  username: string;
  email: string;
  signupDate: string;
  referralCode: string;
  emailVerified: boolean;
  profilePhoto: boolean;
  bioCompleted: boolean;
  reviewsCount: number;
  commentsCount: number;
  top5Selected: boolean;
  followingCount: number;
  likesGiven: number;
  activeDaysWeek1: number;
  convertedToPaid: boolean;
  subscriptionTier?: string;
  allCompleted: boolean;
}

export const adminService = {
  /**
   * Check if admin is authenticated
   */
  isAuthenticated(): boolean {
    const isAuth = sessionStorage.getItem('adminAuthenticated') === 'true';
    const authTime = sessionStorage.getItem('adminAuthTime');

    if (!isAuth || !authTime) return false;

    // Session expires after 4 hours
    const fourHoursAgo = Date.now() - (4 * 60 * 60 * 1000);
    if (parseInt(authTime) < fourHoursAgo) {
      this.logout();
      return false;
    }

    return true;
  },

  /**
   * Logout admin
   */
  logout(): void {
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminAuthTime');
  },

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(dateRange?: { start: Date; end: Date }): Promise<DashboardMetrics> {
    try {
      // Get total user count
      const { count: totalUsers } = await supabase
        .from('user')
        .select('*', { count: 'exact', head: true });

      // Get all referrals with conversions
      const { data: referrals, error: referralError } = await supabase
        .from('referrals')
        .select(`
          *,
          user:user_id (
            id,
            username,
            email,
            created_at
          ),
          conversions:referral_conversions (*)
        `);

      if (referralError) throw referralError;

      const referralUsers = referrals?.length || 0;
      const organicUsers = (totalUsers || 0) - referralUsers;
      const referralPercentage = totalUsers ? (referralUsers / totalUsers) * 100 : 0;

      // Get referral codes
      const { data: codes } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('is_active', true);

      // Process metrics by code
      const codeMetrics: CodeMetrics[] = [];
      let totalRevenue = 0;

      for (const code of codes || []) {
        const codeReferrals = referrals?.filter(r => r.referral_code === code.code) || [];
        const signups = codeReferrals.length;

        let emailVerified = 0;
        let profileCompleted = 0;
        let firstReview = 0;
        let paidConversions = 0;
        let revenue = 0;

        codeReferrals.forEach(ref => {
          const conv = ref.conversions;
          if (!conv) return;

          if (conv.email_verified) emailVerified++;
          if (conv.profile_photo_uploaded && conv.bio_completed) profileCompleted++;
          if (conv.review_1_completed_at) firstReview++;
          if (conv.converted_to_paid) {
            paidConversions++;
            revenue += conv.subscription_amount || 0;
          }
        });

        totalRevenue += revenue;

        codeMetrics.push({
          code: code.code,
          ownerName: code.owner_name,
          signups,
          percentageOfReferrals: referralUsers ? (signups / referralUsers) * 100 : 0,
          emailVerified,
          profileCompleted,
          firstReview,
          paidConversions,
          revenue,
          conversionRate: signups ? (paidConversions / signups) * 100 : 0
        });
      }

      // Calculate overall conversion funnel
      const funnelStages = this.calculateFunnel(referrals || []);

      return {
        totalUsers: totalUsers || 0,
        referralUsers,
        organicUsers,
        referralPercentage,
        totalRevenue,
        codeMetrics,
        conversionFunnel: funnelStages,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  },

  /**
   * Calculate conversion funnel
   */
  calculateFunnel(referrals: any[]): FunnelStage[] {
    const total = referrals.length;
    if (!total) return [];

    let emailVerified = 0;
    let profileCompleted = 0;
    let firstReview = 0;
    let engaged = 0; // 5+ reviews
    let paid = 0;

    referrals.forEach(ref => {
      const conv = ref.conversions;
      if (!conv) return;

      if (conv.email_verified) emailVerified++;
      if (conv.profile_photo_uploaded && conv.bio_completed) profileCompleted++;
      if (conv.review_1_completed_at) firstReview++;
      if (conv.review_5_completed_at) engaged++;
      if (conv.converted_to_paid) paid++;
    });

    return [
      { stage: 'Signups', count: total, percentage: 100 },
      { stage: 'Email Verified', count: emailVerified, percentage: (emailVerified / total) * 100 },
      { stage: 'Profile Completed', count: profileCompleted, percentage: (profileCompleted / total) * 100 },
      { stage: 'First Review', count: firstReview, percentage: (firstReview / total) * 100 },
      { stage: 'Engaged (5+ Reviews)', count: engaged, percentage: (engaged / total) * 100 },
      { stage: 'Paid Member', count: paid, percentage: (paid / total) * 100 }
    ];
  },

  /**
   * Get detailed user list for a specific referral code
   */
  async getUsersByCode(code: string): Promise<UserDetail[]> {
    try {
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select(`
          *,
          user:user_id (
            id,
            username,
            email,
            created_at
          ),
          conversions:referral_conversions (*)
        `)
        .eq('referral_code', code)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (referrals || []).map(ref => ({
        id: ref.user?.id,
        username: ref.user?.username || 'N/A',
        email: ref.user?.email,
        signupDate: ref.created_at,
        referralCode: ref.referral_code,
        emailVerified: ref.conversions?.email_verified || false,
        profilePhoto: ref.conversions?.profile_photo_uploaded || false,
        bioCompleted: ref.conversions?.bio_completed || false,
        reviewsCount: ref.conversions?.reviews_count || 0,
        commentsCount: ref.conversions?.comments_count || 0,
        top5Selected: ref.conversions?.top5_selected || false,
        followingCount: ref.conversions?.following_count || 0,
        likesGiven: ref.conversions?.likes_given_count || 0,
        activeDaysWeek1: ref.conversions?.active_days_week1 || 0,
        convertedToPaid: ref.conversions?.converted_to_paid || false,
        subscriptionTier: ref.conversions?.subscription_tier,
        allCompleted: ref.conversions?.all_completed || false
      }));
    } catch (error) {
      console.error('Error fetching users by code:', error);
      return [];
    }
  },

  /**
   * Export data to CSV
   */
  exportToCSV(data: any[], filename: string): void {
    const csvContent = this.convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Convert data to CSV format
   */
  convertToCSV(data: any[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        const escaped = value?.toString().replace(/"/g, '""') || '';
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }
};