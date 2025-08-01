import { supabase } from './supabase';

/**
 * Get database user ID from auth user
 * Always map auth.uid → user.provider_id → user.id for all database operations
 */
export const getCurrentUserId = async (): Promise<number | null> => {
  try {
    console.log('🔍 Getting current user ID...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 Auth user result:', { user: user ? { id: user.id, email: user.email } : null, authError });
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return null;
    }
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return null;
    }

    console.log('🔍 Looking up database user for provider_id:', user.id);

    const { data: dbUser, error } = await supabase
      .from('user')
      .select('id, provider_id, name, email')
      .eq('provider_id', user.id)
      .single();

    console.log('💾 Database user lookup result:', { dbUser, error });

    if (error) {
      console.error('❌ Error fetching database user ID:', error);
      
      if (error.code === 'PGRST116') {
        console.log('⚠️ User not found in database - may need to be created');
      }
      
      return null;
    }

    const userId = dbUser?.id || null;
    console.log('✅ Found database user ID:', userId);
    
    return userId;
  } catch (error) {
    console.error('💥 Unexpected error in getCurrentUserId:', error);
    return null;
  }
};

/**
 * Ensure game exists in database before creating review
 */
export const ensureGameExists = async (
  gameId: number,
  gameName: string,
  coverImage?: string,
  genre?: string,
  releaseDate?: string
): Promise<ServiceResponse<{ gameId: number }>> => {
  try {
    console.log('🎮 Ensuring game exists:', { gameId, gameName, coverImage, genre, releaseDate });
    
    // Check if game already exists
    const { data: existingGame, error: checkError } = await supabase
      .from('game')
      .select('id, game_id, name')
      .eq('game_id', gameId)
      .single();

    console.log('🔍 Game existence check:', { existingGame, checkError });

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking game existence:', checkError);
      return { success: false, error: `Game existence check failed: ${checkError.message}` };
    }

    if (existingGame) {
      console.log('✅ Game already exists in database:', existingGame);
      return { success: true, data: { gameId: existingGame.id } };
    }

    // Prepare game data for insertion
    const gameData = {
      game_id: gameId,
      name: gameName,
      pic_url: coverImage || null,
      genre: genre || null,
      release_date: releaseDate || null
    };

    console.log('📝 Inserting new game:', gameData);

    // Insert new game
    const { data: newGame, error: insertError } = await supabase
      .from('game')
      .insert(gameData)
      .select('id, game_id, name')
      .single();

    console.log('💾 Game insert result:', { newGame, insertError });

    if (insertError) {
      console.error('❌ Game insert error:', insertError);
      return { success: false, error: `Failed to insert game: ${insertError.message} (Code: ${insertError.code})` };
    }

    console.log('✅ Successfully created game in database:', newGame);
    return { success: true, data: { gameId: newGame.id } };
  } catch (error) {
    console.error('💥 Unexpected error ensuring game exists:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', { name: error.name, message: error.message, stack: error.stack });
    }
    
    return {
      success: false,
      error: error instanceof Error ? `Unexpected error: ${error.message}` : 'Failed to ensure game exists due to unexpected error'
    };
  }
};

/**
 * Create a new review using proper user ID handling
 */
export const createReview = async (
  gameId: number, 
  rating: number, 
  reviewText?: string, 
  isRecommended?: boolean
): Promise<ServiceResponse<Review>> => {
  try {
    console.log('🔍 Creating review with params:', { gameId, rating, reviewText, isRecommended });
    
    const userId = await getCurrentUserId();
    console.log('👤 Current user ID:', userId);
    
    if (!userId) {
      return { success: false, error: 'User not authenticated or not found in database' };
    }

    // Check if game exists in database
    const { data: gameRecord, error: gameError } = await supabase
      .from('game')
      .select('id, game_id, name')
      .eq('game_id', gameId)
      .single();

    console.log('🎮 Game lookup result:', { gameRecord, gameError });

    if (gameError && gameError.code !== 'PGRST116') {
      console.error('❌ Game lookup error:', gameError);
      return { success: false, error: `Game lookup failed: ${gameError.message}` };
    }

    if (!gameRecord) {
      console.error('❌ Game not found in database for gameId:', gameId);
      return { success: false, error: 'Game must be added to database before reviewing. Please ensure game exists first.' };
    }

    console.log('✅ Found game in database:', gameRecord);

    // Check if user has already reviewed this game
    const { data: existingReview, error: existingError } = await supabase
      .from('rating')
      .select('id')
      .eq('user_id', userId)
      .eq('game_id', gameRecord.id)
      .single();

    console.log('🔍 Existing review check:', { existingReview, existingError });

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ Error checking existing review:', existingError);
      return { success: false, error: `Error checking existing review: ${existingError.message}` };
    }

    if (existingReview) {
      console.log('⚠️ User has already reviewed this game');
      return { success: false, error: 'You have already reviewed this game' };
    }

    // Prepare review data
    const reviewData = {
      user_id: userId,
      game_id: gameRecord.id, // Use database game ID
      rating: rating,
      review: reviewText || null,
      post_date_time: new Date().toISOString(),
      finished: isRecommended || false
    };

    console.log('📝 Inserting review data:', reviewData);

    const { data, error } = await supabase
      .from('rating')
      .insert(reviewData)
      .select(`
        *,
        user:user_id(*),
        game:game_id(*)
      `)
      .single();

    console.log('💾 Insert result:', { data, error });

    if (error) {
      console.error('❌ Review insert error:', error);
      return { success: false, error: `Failed to insert review: ${error.message} (Code: ${error.code})` };
    }

    // Transform to our interface
    const review: Review = {
      id: data.id,
      userId: data.user_id,
      gameId: data.game_id,
      rating: data.rating,
      review: data.review,
      postDateTime: data.post_date_time,
      finished: data.finished,
      likeCount: 0,
      commentCount: 0,
      user: data.user ? {
        id: data.user.id,
        name: data.user.name,
        picurl: data.user.picurl
      } : undefined,
      game: data.game ? {
        id: data.game.id,
        name: data.game.name,
        pic_url: data.game.pic_url
      } : undefined
    };

    return { success: true, data: review };
  } catch (error) {
    console.error('💥 Unexpected error creating review:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return {
      success: false,
      error: error instanceof Error ? `Unexpected error: ${error.message}` : 'Failed to create review due to unexpected error'
    };
  }
};

/**
 * Interface for review data
 */
export interface Review {
  id: number;
  userId: number;
  gameId: number;
  rating: number;
  review: string | null;
  postDateTime: string;
  finished: boolean;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  user?: {
    id: number;
    name: string;
    picurl?: string;
  };
  game?: {
    id: number;
    name: string;
    pic_url?: string;
  };
}

/**
 * Interface for comment data
 */
export interface Comment {
  id: number;
  userId: number;
  reviewId: number;
  content: string;
  parentId?: number;
  createdAt: string;
  updatedAt: string;
  likeCount?: number;
  replies?: Comment[];
  user?: {
    id: number;
    name: string;
    picurl?: string;
  };
}

/**
 * Interface for pagination parameters
 */
interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Interface for standardized response
 */
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

/**
 * Get reviews for current user
 */
export const getUserReviews = async (): Promise<ServiceResponse<Review[]>> => {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error, count } = await supabase
      .from('rating')
      .select(`
        *,
        user:user_id(*),
        game:game_id(*)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('post_date_time', { ascending: false });

    if (error) throw error;

    const reviews: Review[] = data?.map(item => ({
      id: item.id,
      userId: item.user_id,
      gameId: item.game_id,
      rating: item.rating,
      review: item.review,
      postDateTime: item.post_date_time,
      finished: item.finished,
      likeCount: 0, // Will be populated by separate query if needed
      commentCount: 0, // Will be populated by separate query if needed
      user: item.user ? {
        id: item.user.id,
        name: item.user.name,
        picurl: item.user.picurl
      } : undefined,
      game: item.game ? {
        id: item.game.id,
        name: item.game.name,
        pic_url: item.game.pic_url
      } : undefined
    })) || [];

    return { success: true, data: reviews, count };
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user reviews'
    };
  }
};

/**
 * Get review by ID with likes and comments count
 */
export const getReview = async (
  reviewId: number
): Promise<ServiceResponse<Review>> => {
  try {
    // Validate input
    if (!reviewId || isNaN(reviewId)) {
      return { success: false, error: 'Invalid review ID' };
    }

    // Fetch review with user and game info
    const { data, error } = await supabase
      .from('rating')
      .select(`
        *,
        user:user_id(*),
        game:game_id(*)
      `)
      .eq('id', reviewId)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Review not found' };

    // Get like count
    const { count: likeCount } = await supabase
      .from('content_like')
      .select('*', { count: 'exact', head: true })
      .eq('rating_id', reviewId);

    // Get comment count
    const { count: commentCount } = await supabase
      .from('review_comment')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId);

    // Transform to our interface
    const review: Review = {
      id: data.id,
      userId: data.user_id,
      gameId: data.game_id,
      rating: data.rating,
      review: data.review,
      postDateTime: data.post_date_time,
      finished: data.finished,
      likeCount: likeCount || 0,
      commentCount: commentCount || 0,
      user: data.user ? {
        id: data.user.id,
        name: data.user.name,
        picurl: data.user.picurl
      } : undefined,
      game: data.game ? {
        id: data.game.id,
        name: data.game.name,
        pic_url: data.game.pic_url
      } : undefined
    };

    return { success: true, data: review };
  } catch (error) {
    console.error('Error fetching review:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch review'
    };
  }
};

/**
 * Check if user has liked a review
 */
export const hasUserLikedReview = async (
  userId: number,
  reviewId: number
): Promise<ServiceResponse<boolean>> => {
  try {
    // Validate input
    if (!userId || isNaN(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }
    if (!reviewId || isNaN(reviewId)) {
      return { success: false, error: 'Invalid review ID' };
    }

    const { data, error } = await supabase
      .from('content_like')
      .select('id')
      .eq('user_id', userId)
      .eq('rating_id', reviewId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw error;
    }

    return { success: true, data: !!data };
  } catch (error) {
    console.error('Error checking if user liked review:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check like status'
    };
  }
};

/**
 * Like a review
 */
export const likeReview = async (
  userId: number,
  reviewId: number
): Promise<ServiceResponse<{ likeCount: number }>> => {
  try {
    // Validate input
    if (!userId || isNaN(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }
    if (!reviewId || isNaN(reviewId)) {
      return { success: false, error: 'Invalid review ID' };
    }

    // Check if like already exists
    const { data: existingLike, error: checkError } = await supabase
      .from('content_like')
      .select('id')
      .eq('user_id', userId)
      .eq('rating_id', reviewId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw checkError;
    }

    // If like already exists, return early
    if (existingLike) {
      // Get current like count
      const { count: likeCount } = await supabase
        .from('content_like')
        .select('*', { count: 'exact', head: true })
        .eq('rating_id', reviewId);

      return {
        success: true,
        data: { likeCount: likeCount || 0 },
        error: 'User already liked this review'
      };
    }

    // Insert new like
    const { error: insertError } = await supabase
      .from('content_like')
      .insert({
        user_id: userId,
        rating_id: reviewId
      });

    if (insertError) throw insertError;

    // Get updated like count
    const { count: likeCount } = await supabase
      .from('content_like')
      .select('*', { count: 'exact', head: true })
      .eq('rating_id', reviewId);

    return {
      success: true,
      data: { likeCount: likeCount || 0 }
    };
  } catch (error) {
    console.error('Error liking review:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to like review'
    };
  }
};

/**
 * Unlike a review
 */
export const unlikeReview = async (
  userId: number,
  reviewId: number
): Promise<ServiceResponse<{ likeCount: number }>> => {
  try {
    // Validate input
    if (!userId || isNaN(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }
    if (!reviewId || isNaN(reviewId)) {
      return { success: false, error: 'Invalid review ID' };
    }

    // Delete the like
    const { error: deleteError } = await supabase
      .from('content_like')
      .delete()
      .eq('user_id', userId)
      .eq('rating_id', reviewId);

    if (deleteError) throw deleteError;

    // Get updated like count
    const { count: likeCount } = await supabase
      .from('content_like')
      .select('*', { count: 'exact', head: true })
      .eq('rating_id', reviewId);

    return {
      success: true,
      data: { likeCount: likeCount || 0 }
    };
  } catch (error) {
    console.error('Error unliking review:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlike review'
    };
  }
};

/**
 * Get comments for a review
 */
export const getCommentsForReview = async (
  reviewId: number,
  { limit = 50, offset = 0 }: PaginationParams = {}
): Promise<ServiceResponse<Comment[]>> => {
  try {
    // Validate input
    if (!reviewId || isNaN(reviewId)) {
      return { success: false, error: 'Invalid review ID' };
    }

    // Fetch all comments for the review
    const { data, error, count } = await supabase
      .from('review_comment')
      .select(`
        *,
        user:user_id(id, name, picurl)
      `, { count: 'exact' })
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Build nested structure
    const commentMap = new Map<number, Comment>();
    const topLevelComments: Comment[] = [];

    // First pass: create all comment objects
    data?.forEach(item => {
      const comment: Comment = {
        id: item.id,
        userId: item.user_id,
        reviewId: item.review_id,
        content: item.content,
        parentId: item.parent_id || undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        replies: [],
        user: item.user ? {
          id: item.user.id,
          name: item.user.name,
          picurl: item.user.picurl
        } : undefined
      };

      commentMap.set(comment.id, comment);
    });

    // Second pass: build the tree structure
    commentMap.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies?.push(comment);
        } else {
          // If parent doesn't exist, treat as top-level
          topLevelComments.push(comment);
        }
      } else {
        topLevelComments.push(comment);
      }
    });

    // Sort replies by timestamp (oldest first)
    commentMap.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
    });

    return {
      success: true,
      data: topLevelComments,
      count
    };
  } catch (error) {
    console.error('Error fetching comments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch comments'
    };
  }
};

/**
 * Add a comment to a review
 */
export const addComment = async (
  userId: number,
  reviewId: number,
  content: string,
  parentId?: number
): Promise<ServiceResponse<Comment>> => {
  try {
    // Validate input
    if (!userId || isNaN(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }
    if (!reviewId || isNaN(reviewId)) {
      return { success: false, error: 'Invalid review ID' };
    }
    if (!content || content.trim().length === 0) {
      return { success: false, error: 'Comment content cannot be empty' };
    }
    if (content.length > 500) {
      return { success: false, error: 'Comment content exceeds maximum length (500 characters)' };
    }

    // Sanitize content (basic implementation - in production use a proper sanitizer)
    const sanitizedContent = content.trim();

    // Validate parent comment if provided
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('review_comment')
        .select('id')
        .eq('id', parentId)
        .single();

      if (parentError) {
        return { success: false, error: 'Parent comment not found' };
      }
    }

    // Insert comment
    const { data, error } = await supabase
      .from('review_comment')
      .insert({
        user_id: userId,
        review_id: reviewId,
        content: sanitizedContent,
        parent_id: parentId || null
      })
      .select(`
        *,
        user:user_id(id, name, picurl)
      `)
      .single();

    if (error) throw error;

    // Transform to our interface
    const comment: Comment = {
      id: data.id,
      userId: data.user_id,
      reviewId: data.review_id,
      content: data.content,
      parentId: data.parent_id || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      replies: [],
      user: data.user ? {
        id: data.user.id,
        name: data.user.name,
        picurl: data.user.picurl
      } : undefined
    };

    return {
      success: true,
      data: comment
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add comment'
    };
  }
};
