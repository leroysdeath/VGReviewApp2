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
  // Normalize accented characters to their ASCII equivalents
  const normalizedName = name
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks
    
  const baseSlug = normalizedName
    .toLowerCase()
    .trim() // Trim whitespace first
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  
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
  
  // Normalize accented characters to their ASCII equivalents
  const normalizedName = name
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks
    
  // First try the basic slug
  let baseSlug = normalizedName
    .toLowerCase()
    .trim() // Trim whitespace first
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  
  try {
    // Check if base slug exists with timeout and error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const { data: existingGame, error } = await supabase
      .from('game')
      .select('id, igdb_id')
      .eq('slug', baseSlug)
      .neq('igdb_id', igdbId) // Don't conflict with same game
      .abortSignal(controller.signal)
      .single();
    
    clearTimeout(timeoutId);
    
    // If query failed or timed out, use fallback with IGDB ID
    if (error) {
      console.warn(`Slug conflict check failed for "${baseSlug}":`, error.message);
      return `${baseSlug}-${igdbId}`;
    }
    
    // If no conflict, use base slug
    if (!existingGame) {
      return baseSlug;
    }
    
    // If conflict exists, append IGDB ID for uniqueness
    return `${baseSlug}-${igdbId}`;
    
  } catch (abortError) {
    console.warn(`Slug generation timed out for "${name}", using fallback`);
    return `${baseSlug}-${igdbId}`;
  }
};

/**
 * Generate unique slugs for multiple games in batch (more efficient)
 * Falls back to individual generation if batch fails
 */
export const generateUniqueSlugsInBatch = async (games: Array<{name: string, id: number}>): Promise<Map<number, string>> => {
  const slugMap = new Map<number, string>();
  
  try {
    // Import supabase here to avoid circular dependency  
    const { supabase } = await import('../services/supabase');
    
    // Generate base slugs for all games
    const gameWithSlugs = games.map(game => ({
      ...game,
      baseSlug: generateSlug(game.name, game.id) // Use the simple version first
    }));
    
    // Check existing slugs in one query (with timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for batch
    
    const allBaseSlugs = gameWithSlugs.map(g => g.baseSlug);
    const { data: existingSlugs, error } = await supabase
      .from('game')
      .select('slug, igdb_id')
      .in('slug', allBaseSlugs)
      .abortSignal(controller.signal);
    
    clearTimeout(timeoutId);
    
    if (error) {
      console.warn('Batch slug check failed, falling back to individual generation:', error.message);
      // Fallback to individual generation
      for (const game of games) {
        try {
          const slug = await generateUniqueSlug(game.name, game.id);
          slugMap.set(game.id, slug);
        } catch (e) {
          // Ultimate fallback - just use basic slug with ID
          slugMap.set(game.id, generateSlug(game.name, game.id));
        }
      }
      return slugMap;
    }
    
    // Create a set of existing slugs for quick lookup
    const existingSlugSet = new Set(existingSlugs?.map(s => s.slug) || []);
    
    // Generate final slugs
    for (const game of gameWithSlugs) {
      if (!existingSlugSet.has(game.baseSlug)) {
        // No conflict, use base slug
        slugMap.set(game.id, game.baseSlug);
      } else {
        // Conflict exists, append IGDB ID
        slugMap.set(game.id, `${game.baseSlug}-${game.id}`);
      }
    }
    
    return slugMap;
    
  } catch (abortError) {
    console.warn('Batch slug generation timed out, using fallback slugs');
    // Ultimate fallback - generate simple slugs with IDs
    for (const game of games) {
      slugMap.set(game.id, generateSlug(game.name, game.id));
    }
    return slugMap;
  }
};