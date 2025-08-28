// src/utils/gameUrls.ts
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

// Helper to generate slug from name
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};