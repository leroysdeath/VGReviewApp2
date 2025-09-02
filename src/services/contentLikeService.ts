import { supabase } from './supabase';

interface LikeStatus {
  liked: boolean;
  count: number;
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ContentLikeService {
  /**
   * Get bulk like status for multiple reviews
   * Efficiently fetches like counts and user's like status in minimal queries
   */
  async getBulkLikeStatus(
    userId: number | undefined,
    ratingIds: number[]
  ): Promise<Map<number, LikeStatus>> {
    const result = new Map<number, LikeStatus>();
    
    if (!ratingIds || ratingIds.length === 0) {
      return result;
    }

    try {
      // Get like counts from rating table (maintained by trigger, very fast)
      const { data: ratings, error: ratingsError } = await supabase
        .from('rating')
        .select('id, like_count')
        .in('id', ratingIds);

      if (ratingsError) {
        console.error('Error fetching rating like counts:', ratingsError);
      }

      // Get user's likes if logged in
      let userLikes = new Set<number>();
      if (userId && userId > 0) {
        const { data: likes, error: likesError } = await supabase
          .from('content_like')
          .select('rating_id')
          .eq('user_id', userId)
          .in('rating_id', ratingIds)
          .not('rating_id', 'is', null);

        if (likesError) {
          console.error('Error fetching user likes:', likesError);
        } else if (likes) {
          userLikes = new Set(likes.map(l => l.rating_id));
        }
      }

      // Build result map with like status for each rating
      ratingIds.forEach(id => {
        const rating = ratings?.find(r => r.id === id);
        result.set(id, {
          liked: userLikes.has(id),
          count: rating?.like_count || 0
        });
      });

      console.log(`✅ Loaded bulk like status for ${ratingIds.length} reviews`);
    } catch (error) {
      console.error('Error in getBulkLikeStatus:', error);
    }

    return result;
  }

  /**
   * Toggle like for a review
   */
  async toggleReviewLike(
    userId: number,
    ratingId: number
  ): Promise<ServiceResponse<{ liked: boolean; count: number }>> {
    try {
      // Check if like exists
      const { data: existingLike, error: checkError } = await supabase
        .from('content_like')
        .select('id')
        .eq('user_id', userId)
        .eq('rating_id', ratingId)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      let liked = false;
      
      if (existingLike) {
        // Unlike - remove the like
        const { error: deleteError } = await supabase
          .from('content_like')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) {
          throw deleteError;
        }
        
        liked = false;
        console.log('👎 Review unliked');
      } else {
        // Like - add new like
        const { error: insertError } = await supabase
          .from('content_like')
          .insert({
            user_id: userId,
            rating_id: ratingId,
            is_like: true
          });

        if (insertError) {
          // Check if it's a duplicate key error (user already liked)
          if (insertError.code === '23505') {
            return {
              success: true,
              data: { liked: true, count: 0 },
              error: 'Already liked'
            };
          }
          throw insertError;
        }
        
        liked = true;
        console.log('👍 Review liked');
      }

      // Get updated count from rating table (maintained by trigger)
      const { data: rating, error: countError } = await supabase
        .from('rating')
        .select('like_count')
        .eq('id', ratingId)
        .single();

      if (countError) {
        console.error('Error fetching updated like count:', countError);
      }

      return {
        success: true,
        data: {
          liked,
          count: rating?.like_count || 0
        }
      };
    } catch (error) {
      console.error('Error toggling review like:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle like'
      };
    }
  }

  /**
   * Get like status for a single review
   */
  async getReviewLikeStatus(
    userId: number | undefined,
    ratingId: number
  ): Promise<LikeStatus> {
    const statuses = await this.getBulkLikeStatus(userId, [ratingId]);
    return statuses.get(ratingId) || { liked: false, count: 0 };
  }

  /**
   * Check if user has liked a review
   */
  async hasUserLikedReview(
    userId: number,
    ratingId: number
  ): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('content_like')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('rating_id', ratingId);

      if (error) {
        console.error('Error checking like status:', error);
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      console.error('Error in hasUserLikedReview:', error);
      return false;
    }
  }
}

// Export singleton instance
export const contentLikeService = new ContentLikeService();