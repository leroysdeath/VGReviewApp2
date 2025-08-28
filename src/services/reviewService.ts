import { supabase } from './supabase';
import { sanitizeRich } from '../utils/sanitize';

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
 * If game doesn't exist, it will be added using the IGDB ID and game details
 */
export const ensureGameExists = async (
  gameData: {
    id: number;        // Database ID (could be negative for IGDB-only games)
    igdb_id: number;   // IGDB ID
    name: string;      // Game title
    cover_url?: string;
    genre?: string;
    releaseDate?: string;
  }
): Promise<ServiceResponse<{ gameId: number }>> => {
  try {
    console.log('🎮 Ensuring game exists:', gameData);
    
    // Ensure we have a valid IGDB ID
    if (gameData.igdb_id === undefined || gameData.igdb_id === null || isNaN(gameData.igdb_id) || gameData.igdb_id <= 0) {
      console.error('❌ Missing or invalid igdb_id in gameData:', gameData);
      console.error('❌ igdb_id type:', typeof gameData.igdb_id, 'value:', gameData.igdb_id);
      return { success: false, error: 'Game data missing valid IGDB ID' };
    }
    
    // If we have a valid positive database ID, check if it exists
    if (gameData.id > 0) {
      const { data: existingGame, error: checkError } = await supabase
        .from('game')
        .select('id, name')
        .eq('id', gameData.id)
        .single();

      if (!checkError && existingGame) {
        console.log('✅ Game exists in database:', existingGame);
        return { success: true, data: { gameId: existingGame.id } };
      }
    }

    // If game doesn't exist (negative ID or not found), try to find by IGDB ID
    console.log('🔍 Checking by IGDB ID:', gameData.igdb_id);
    const { data: existingByIGDB, error: igdbError } = await supabase
      .from('game')
      .select('id, name, igdb_id')
      .eq('igdb_id', gameData.igdb_id)
      .single();

    if (!igdbError && existingByIGDB) {
      console.log('✅ Found game by IGDB ID:', existingByIGDB);
      return { success: true, data: { gameId: existingByIGDB.id } };
    }

    // Game doesn't exist in database, need to add it
    console.log('💾 Adding game to database:', gameData.name);
    
    // Convert Unix timestamp to ISO date string if needed
    let releaseDate = null;
    if (gameData.releaseDate) {
      if (typeof gameData.releaseDate === 'number') {
        // IGDB returns Unix timestamps, convert to ISO date string
        releaseDate = new Date(gameData.releaseDate * 1000).toISOString().split('T')[0];
        console.log(`📅 Converted Unix timestamp ${gameData.releaseDate} to date: ${releaseDate}`);
      } else if (typeof gameData.releaseDate === 'string') {
        // Already a string, use as is (might be ISO date or other format)
        releaseDate = gameData.releaseDate;
        console.log(`📅 Using string date as is: ${releaseDate}`);
      }
    }
    
    // Final validation before insertion - ensure all required fields are valid
    if (!gameData.name || gameData.name.trim().length === 0) {
      console.error('❌ Game name is required for insertion');
      return { success: false, error: 'Game name is required' };
    }

    const gameToInsert = {
      igdb_id: gameData.igdb_id,
      game_id: gameData.igdb_id.toString(), // Convert IGDB ID to string for game_id column
      name: gameData.name.trim(),
      cover_url: gameData.cover_url || null,
      genres: gameData.genre ? [gameData.genre] : null,
      release_date: releaseDate,
    };

    console.log('📝 Prepared game data for insertion:', gameToInsert);

    const { data: insertedGame, error: insertError } = await supabase
      .from('game')
      .insert(gameToInsert)
      .select('id, name')
      .single();

    if (insertError) {
      console.error('❌ Error inserting game:', insertError);
      return { success: false, error: `Failed to add game to database: ${insertError.message}` };
    }

    console.log('✅ Game added to database:', insertedGame);
    return { success: true, data: { gameId: insertedGame.id } };
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
 * @param igdbId - The IGDB ID of the game
 * @param rating - The rating score
 * @param reviewText - The review text (optional)
 * @param isRecommended - Whether the game is recommended
 */
export const createReview = async (
  igdbId: number, 
  rating: number, 
  reviewText?: string, 
  isRecommended?: boolean
): Promise<ServiceResponse<Review>> => {
  try {
    console.log('🔍 Creating review with params:', { igdbId, rating, reviewText, isRecommended });
    
    const userId = await getCurrentUserId();
    console.log('👤 Current user ID:', userId);
    
    if (!userId) {
      return { success: false, error: 'User not authenticated or not found in database' };
    }

    // Look up existing game by IGDB ID
    const { data: gameRecord, error: gameError } = await supabase
      .from('game')
      .select('id, name')
      .eq('igdb_id', igdbId)
      .single();

    console.log('🎮 Game lookup result:', { gameRecord, gameError });

    if (gameError && gameError.code !== 'PGRST116') {
      console.error('❌ Game lookup error:', gameError);
      return { success: false, error: `Game lookup failed: ${gameError.message}` };
    }

    if (!gameRecord) {
      console.error('❌ Game not found in database for IGDB ID:', igdbId);
      return { success: false, error: 'Game not found in database. Please select a game from the search results.' };
    }

    const gameId = gameRecord.id;

    console.log('✅ Using game ID:', gameId);

    // Check if user has already reviewed this game
    const { data: existingReview, error: existingError } = await supabase
      .from('rating')
      .select('id')
      .eq('user_id', userId)
      .eq('game_id', gameId)
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

    // Prepare review data with sanitization
    const reviewData = {
      user_id: userId,
      game_id: gameId, // Database game ID
      igdb_id: igdbId, // Also store IGDB ID for reference
      rating: rating,
      review: reviewText ? sanitizeRich(reviewText) : null, // Sanitize review text
      post_date_time: new Date().toISOString(),
      is_recommended: isRecommended
    };

    console.log('📝 Inserting review data:', reviewData);

    const { data, error } = await supabase
      .from('rating')
      .insert(reviewData)
      .select(`
        *,
        user!fk_rating_user(*),
        game(*)
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
      isRecommended: data.is_recommended,
      likeCount: 0,
      commentCount: 0,
      user: data.user ? {
        id: data.user.id,
        name: data.user.username || data.user.name,
        avatar_url: data.user.avatar_url
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
  igdb_id?: number; // Add igdb_id from rating table
  rating: number;
  review: string | null;
  postDateTime: string;
  isRecommended: boolean | null;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  user?: {
    id: number;
    name: string;
    avatar_url?: string;
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
    avatar_url?: string;
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
 * Get user's review for a specific game by IGDB ID
 * @param igdbId - The IGDB ID of the game
 */
export const getUserReviewForGameByIGDBId = async (igdbId: number): Promise<ServiceResponse<Review | null>> => {
  try {
    console.log('🔍 Getting user review for game IGDB ID:', igdbId);
    
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // First find the database game ID by IGDB ID
    const { data: gameData, error: gameError } = await supabase
      .from('game')
      .select('id')
      .eq('igdb_id', igdbId)
      .single();

    if (gameError && gameError.code !== 'PGRST116') {
      console.error('❌ Error finding game by IGDB ID:', gameError);
      return { success: false, error: `Failed to find game: ${gameError.message}` };
    }

    if (!gameData) {
      console.log('ℹ️ Game not found in database for IGDB ID:', igdbId);
      return { success: true, data: null };
    }

    // Now get the user's review using the database game ID
    return await getUserReviewForGame(gameData.id);
  } catch (error) {
    console.error('💥 Unexpected error getting user review by IGDB ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user review'
    };
  }
};

/**
 * Get user's review for a specific game
 * @param gameId - The database game.id (not IGDB ID)
 */
export const getUserReviewForGame = async (gameId: number): Promise<ServiceResponse<Review | null>> => {
  try {
    console.log('🔍 Getting user review for game:', gameId);
    
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get the user's review for this game using database ID directly
    const { data, error } = await supabase
      .from('rating')
      .select(`
        *,
        user!fk_rating_user(*),
        game(*)
      `)
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching user review:', error);
      return { success: false, error: `Failed to fetch review: ${error.message}` };
    }

    if (!data) {
      console.log('ℹ️ No review found for user and game');
      return { success: true, data: null };
    }

    // Transform to our interface
    const review: Review = {
      id: data.id,
      userId: data.user_id,
      gameId: data.game_id,
      rating: data.rating,
      review: data.review,
      postDateTime: data.post_date_time,
      isRecommended: data.is_recommended,
      likeCount: 0,
      commentCount: 0,
      user: data.user ? {
        id: data.user.id,
        name: data.user.username || data.user.name,
        avatar_url: data.user.avatar_url
      } : undefined,
      game: data.game ? {
        id: data.game.id,
        name: data.game.name,
        pic_url: data.game.pic_url
      } : undefined
    };

    console.log('✅ Found user review:', review);
    return { success: true, data: review };
  } catch (error) {
    console.error('💥 Unexpected error getting user review:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user review'
    };
  }
};

/**
 * Update an existing review
 */
export const updateReview = async (
  reviewId: number,
  gameId: number,
  rating: number,
  reviewText?: string,
  isRecommended?: boolean
): Promise<ServiceResponse<Review>> => {
  try {
    console.log('🔄 Updating review:', { reviewId, gameId, rating, reviewText, isRecommended });
    
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Verify the review belongs to the current user
    const { data: existingReview, error: verifyError } = await supabase
      .from('rating')
      .select('id, user_id')
      .eq('id', reviewId)
      .eq('user_id', userId)
      .single();

    if (verifyError || !existingReview) {
      console.error('❌ Review not found or access denied:', verifyError);
      return { success: false, error: 'Review not found or you do not have permission to edit it' };
    }

    // Update the review with sanitization
    const { data, error } = await supabase
      .from('rating')
      .update({
        rating: rating,
        review: reviewText ? sanitizeRich(reviewText) : null, // Sanitize review text
        is_recommended: isRecommended,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select(`
        *,
        user!fk_rating_user(*),
        game(*)
      `)
      .single();

    if (error) {
      console.error('❌ Review update error:', error);
      return { success: false, error: `Failed to update review: ${error.message} (Code: ${error.code})` };
    }

    // Transform to our interface
    const review: Review = {
      id: data.id,
      userId: data.user_id,
      gameId: data.game_id,
      rating: data.rating,
      review: data.review,
      postDateTime: data.post_date_time,
      isRecommended: data.is_recommended,
      likeCount: 0,
      commentCount: 0,
      user: data.user ? {
        id: data.user.id,
        name: data.user.username || data.user.name,
        avatar_url: data.user.avatar_url
      } : undefined,
      game: data.game ? {
        id: data.game.id,
        name: data.game.name,
        pic_url: data.game.pic_url
      } : undefined
    };

    console.log('✅ Review updated successfully:', review);
    return { success: true, data: review };
  } catch (error) {
    console.error('💥 Unexpected error updating review:', error);
    return {
      success: false,
      error: error instanceof Error ? `Unexpected error: ${error.message}` : 'Failed to update review due to unexpected error'
    };
  }
};

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
        user!fk_rating_user(*),
        game(*)
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
      isRecommended: item.is_recommended,
      likeCount: 0, // Will be populated by separate query if needed
      commentCount: 0, // Will be populated by separate query if needed
      user: item.user ? {
        id: item.user.id,
        name: item.user.name,
        avatar_url: item.user.avatar_url
      } : undefined,
      game: item.game ? {
        id: item.game.id,
        name: item.game.name,
        pic_url: item.game.pic_url || item.game.cover_url
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
        user!fk_rating_user(*),
        game(*)
      `)
      .eq('id', reviewId)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Review not found' };

    // Use computed columns for much faster performance (no JOINs or COUNT queries needed)
    const likeCount = data.like_count || 0;
    const commentCount = data.comment_count || 0;

    // Transform to our interface
    const review: Review = {
      id: data.id,
      userId: data.user_id,
      gameId: data.game_id,
      rating: data.rating,
      review: data.review,
      postDateTime: data.post_date_time,
      isRecommended: data.is_recommended,
      likeCount: likeCount || 0,
      commentCount: commentCount || 0,
      user: data.user ? {
        id: data.user.id,
        name: data.user.username || data.user.name,
        avatar_url: data.user.avatar_url
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
      // Get current like count from computed column (much faster)
      const { data: ratingData } = await supabase
        .from('rating')
        .select('like_count')
        .eq('id', reviewId)
        .single();
      
      const likeCount = ratingData?.like_count || 0;

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

    // Get updated like count from computed column (much faster)
    const { data: ratingData } = await supabase
      .from('rating')
      .select('like_count')
      .eq('id', reviewId)
      .single();
    
    const likeCount = ratingData?.like_count || 0;

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

    // Get updated like count from computed column (much faster)
    const { data: ratingData } = await supabase
      .from('rating')
      .select('like_count')
      .eq('id', reviewId)
      .single();
    
    const likeCount = ratingData?.like_count || 0;

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
      .from('comment')
      .select(`
        *,
        user:user_id(id, username, name, avatar_url)
      `, { count: 'exact' })
      .eq('rating_id', reviewId)
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
        reviewId: item.rating_id,
        content: item.content,
        parentId: item.parent_comment_id || undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        replies: [],
        user: item.user ? {
          id: item.user.id,
          name: item.user.username || item.user.name,
          avatar_url: item.user.avatar_url
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

    // Sanitize content to prevent XSS attacks
    const sanitizedContent = sanitizeRich(content.trim());

    // Validate parent comment if provided
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comment')
        .select('id')
        .eq('id', parentId)
        .single();

      if (parentError) {
        return { success: false, error: 'Parent comment not found' };
      }
    }

    // Insert comment
    const { data, error } = await supabase
      .from('comment')
      .insert({
        user_id: userId,
        rating_id: reviewId,
        content: sanitizedContent,
        parent_comment_id: parentId || null,
        is_published: true
      })
      .select(`
        *,
        user:user_id(id, username, name, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Transform to our interface
    const comment: Comment = {
      id: data.id,
      userId: data.user_id,
      reviewId: data.rating_id,
      content: data.content,
      parentId: data.parent_comment_id || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      replies: [],
      user: data.user ? {
        id: data.user.id,
        name: data.user.username || data.user.name,
        avatar_url: data.user.avatar_url
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

/**
 * Get recent reviews from all users (for landing page)
 */
export const getReviews = async (limit = 10): Promise<ServiceResponse<Review[]>> => {
  try {
    console.log('🔍 Fetching recent reviews:', { limit });

    const { data, error, count } = await supabase
      .from('rating')
      .select(`
        *,
        user!fk_rating_user(*),
        game(id, name, pic_url, cover_url, game_id, igdb_id)
      `, { count: 'exact' })
      .order('post_date_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching reviews:', error);
      throw error;
    }

    const reviews: Review[] = data?.map(item => ({
      id: item.id,
      userId: item.user_id,
      gameId: item.game_id,
      igdb_id: item.igdb_id, // Include igdb_id from rating table
      rating: item.rating,
      review: item.review,
      postDateTime: item.post_date_time,
      isRecommended: item.is_recommended,
      likeCount: 0, // Will be populated by separate query if needed
      commentCount: 0, // Will be populated by separate query if needed
      user: item.user ? {
        id: item.user.id,
        name: item.user.name,
        avatar_url: item.user.avatar_url
      } : undefined,
      game: item.game ? {
        id: item.game.id,
        name: item.game.name,
        pic_url: item.game.pic_url || item.game.cover_url
      } : undefined
    })) || [];

    console.log('✅ Successfully fetched reviews:', { count: reviews.length });
    return { success: true, data: reviews, count };
  } catch (error) {
    console.error('💥 Error fetching reviews:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch reviews'
    };
  }
};
