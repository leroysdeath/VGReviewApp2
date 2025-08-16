import { supabase } from './supabase';

export interface TopGame {
  id?: string;
  user_id: number;
  game_id: number;
  position: number;
  game?: {
    id: number;
    name: string;
    pic_url: string;
  };
  rating?: number;
}

// Fetch user's Top 5 games
export async function getUserTopGames(userId: string): Promise<TopGame[]> {
  try {
    const { data, error } = await supabase
      .from('user_top_games')
      .select(`
        id,
        user_id,
        game_id,
        position,
        game:game_id (
          id,
          name,
          pic_url
        )
      `)
      .eq('user_id', parseInt(userId))
      .order('position', { ascending: true });

    if (error) throw error;

    // Also fetch ratings for these games
    if (data && data.length > 0) {
      const gameIds = data.map(item => item.game_id);
      const { data: ratings } = await supabase
        .from('rating')
        .select('game_id, rating')
        .eq('user_id', parseInt(userId))
        .in('game_id', gameIds);

      // Merge ratings with top games data
      const ratingsMap = new Map(ratings?.map(r => [r.game_id, r.rating]) || []);
      
      return data.map(item => ({
        ...item,
        rating: ratingsMap.get(item.game_id) || 0
      }));
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user top games:', error);
    return [];
  }
}

// Save/Update user's Top 5 games
export async function saveUserTopGames(
  userId: string, 
  games: Array<{ game_id: number; position: number }>
): Promise<boolean> {
  try {
    // First, delete existing top games for the user
    const { error: deleteError } = await supabase
      .from('user_top_games')
      .delete()
      .eq('user_id', parseInt(userId));

    if (deleteError) throw deleteError;

    // If there are no games to save, return success
    if (games.length === 0) {
      return true;
    }

    // Insert new top games
    const topGamesData = games.map(game => ({
      user_id: parseInt(userId),
      game_id: game.game_id,
      position: game.position
    }));

    const { error: insertError } = await supabase
      .from('user_top_games')
      .insert(topGamesData);

    if (insertError) throw insertError;

    return true;
  } catch (error) {
    console.error('Error saving user top games:', error);
    return false;
  }
}

// Add a single game to a specific position
export async function addGameToTopPosition(
  userId: string,
  gameId: number,
  position: number
): Promise<boolean> {
  try {
    // First check if this game is already in the top 5
    const { data: existing } = await supabase
      .from('user_top_games')
      .select('id, position')
      .eq('user_id', parseInt(userId))
      .eq('game_id', gameId)
      .single();

    if (existing) {
      // Game already exists, update its position
      const { error } = await supabase
        .from('user_top_games')
        .update({ position })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Check if position is already occupied
      const { data: occupiedSlot } = await supabase
        .from('user_top_games')
        .select('id')
        .eq('user_id', parseInt(userId))
        .eq('position', position)
        .single();

      if (occupiedSlot) {
        // Update existing slot with new game
        const { error } = await supabase
          .from('user_top_games')
          .update({ game_id: gameId })
          .eq('id', occupiedSlot.id);

        if (error) throw error;
      } else {
        // Insert new game at position
        const { error } = await supabase
          .from('user_top_games')
          .insert({
            user_id: parseInt(userId),
            game_id: gameId,
            position
          });

        if (error) throw error;
      }
    }

    return true;
  } catch (error) {
    console.error('Error adding game to top position:', error);
    return false;
  }
}

// Remove a game from Top 5
export async function removeGameFromTop(
  userId: string,
  gameId: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_top_games')
      .delete()
      .eq('user_id', parseInt(userId))
      .eq('game_id', gameId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error removing game from top:', error);
    return false;
  }
}

// Update positions after drag-and-drop reorder
export async function updateTopGamesOrder(
  userId: string,
  games: Array<{ game_id: number; position: number }>
): Promise<boolean> {
  try {
    // Use a transaction-like approach: delete all and re-insert
    return await saveUserTopGames(userId, games);
  } catch (error) {
    console.error('Error updating top games order:', error);
    return false;
  }
}
