// URL helper utilities for game page routing
// Supports both slug-based URLs and IGDB ID fallbacks

export const getGameUrl = (game: {
  slug?: string | null;
  igdb_id?: number;
  id: number;
  name?: string;
}) => {
  // Priority 1: Use slug if available
  if (game.slug) {
    return `/game/${game.slug}`;
  }
  
  // Priority 2: Use IGDB ID (backward compatibility)
  if (game.igdb_id) {
    return `/game/${game.igdb_id}`;
  }
  
  // Priority 3: Generate slug from name (temporary)
  if (game.name) {
    const tempSlug = game.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    return `/game/${tempSlug}`;
  }
  
  // Last resort: Use database ID (should rarely happen)
  return `/game/${game.id}`;
};

export const getGameUrlFromIGDB = (igdbId: number) => {
  return `/game/${igdbId}`;
};

// Helper to determine if identifier is numeric (IGDB ID)
export const isNumericIdentifier = (identifier: string): boolean => {
  return /^\d+$/.test(identifier);
};

// Helper to generate slug from name with collision handling
export const generateSlug = (name: string, igdbId?: number): string => {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  // If we have an IGDB ID, append it to ensure uniqueness
  if (igdbId) {
    return `${baseSlug}-${igdbId}`;
  }
  
  return baseSlug;
};

// Helper to generate slug with guaranteed uniqueness check
export const generateUniqueSlug = async (name: string, igdbId: number): Promise<string> => {
  // Import supabase here to avoid circular dependency
  const { supabase } = await import('../services/supabase');
  
  // First try the basic slug
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  // Check if base slug exists
  const { data: existingGame } = await supabase
    .from('game')
    .select('id, igdb_id')
    .eq('slug', baseSlug)
    .neq('igdb_id', igdbId) // Don't conflict with same game
    .single();
  
  // If no conflict, use base slug
  if (!existingGame) {
    return baseSlug;
  }
  
  // If conflict exists, append IGDB ID for uniqueness
  return `${baseSlug}-${igdbId}`;
};