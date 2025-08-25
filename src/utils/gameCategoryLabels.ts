// Game Category Labels for Search Results
// Maps IGDB category numbers to display labels

export interface GameCategory {
  id: number;
  label: string;
  color: string;
  bgColor: string;
}

/**
 * IGDB Game Categories:
 * 0 = Main game
 * 1 = DLC/Add-on
 * 2 = Expansion
 * 3 = Bundle
 * 4 = Standalone expansion
 * 5 = Mod
 * 6 = Episode
 * 7 = Season
 * 8 = Remake
 * 9 = Remaster
 * 10 = Expanded game
 * 11 = Port
 * 12 = Fork
 * 13 = Pack
 * 14 = Update
 */

export const CATEGORY_MAPPINGS: Record<number, GameCategory> = {
  1: { id: 1, label: 'DLC', color: 'text-blue-300', bgColor: 'bg-blue-600' },
  2: { id: 2, label: 'Expansion', color: 'text-purple-300', bgColor: 'bg-purple-600' },
  3: { id: 3, label: 'Bundle', color: 'text-green-300', bgColor: 'bg-green-600' },
  4: { id: 4, label: 'Standalone Expansion', color: 'text-indigo-300', bgColor: 'bg-indigo-600' },
  5: { id: 5, label: 'Mod', color: 'text-orange-300', bgColor: 'bg-orange-600' },
  6: { id: 6, label: 'Episode', color: 'text-pink-300', bgColor: 'bg-pink-600' },
  7: { id: 7, label: 'Season', color: 'text-teal-300', bgColor: 'bg-teal-600' },
  8: { id: 8, label: 'Remake', color: 'text-yellow-300', bgColor: 'bg-yellow-600' },
  9: { id: 9, label: 'Remaster', color: 'text-cyan-300', bgColor: 'bg-cyan-600' },
  10: { id: 10, label: 'Expanded Edition', color: 'text-violet-300', bgColor: 'bg-violet-600' },
  11: { id: 11, label: 'Port', color: 'text-slate-300', bgColor: 'bg-slate-600' },
  12: { id: 12, label: 'Fork', color: 'text-stone-300', bgColor: 'bg-stone-600' },
  13: { id: 13, label: 'Pack', color: 'text-emerald-300', bgColor: 'bg-emerald-600' },
  14: { id: 14, label: 'Update', color: 'text-gray-300', bgColor: 'bg-gray-600' }
};

/**
 * Get category information for a game
 */
export function getGameCategory(category: number | null | undefined): GameCategory | null {
  if (!category || category === 0) {
    return null; // Main game, no label needed
  }
  
  return CATEGORY_MAPPINGS[category] || null;
}

/**
 * Check if a game should display a category label
 */
export function shouldShowCategoryLabel(category: number | null | undefined): boolean {
  return category !== null && category !== undefined && category !== 0;
}

/**
 * Get category label text for display
 */
export function getCategoryLabel(category: number | null | undefined): string | null {
  const categoryInfo = getGameCategory(category);
  return categoryInfo ? categoryInfo.label : null;
}

/**
 * Get category styling classes
 */
export function getCategoryStyles(category: number | null | undefined): { text: string; bg: string } | null {
  const categoryInfo = getGameCategory(category);
  return categoryInfo ? { text: categoryInfo.color, bg: categoryInfo.bgColor } : null;
}