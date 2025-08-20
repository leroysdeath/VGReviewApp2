// DLC/Expansion Service - Handles fetching related content for games
import type { IGDBGame } from './igdbService';

interface DLCGame {
  id: number;
  name: string;
  summary?: string;
  first_release_date?: number;
  cover?: {
    id: number;
    url: string;
  };
  category: number;
  parent_game?: number;
}

interface DLCResponse {
  success: boolean;
  games: DLCGame[];
  error?: string;
}

class DLCService {
  private readonly endpoint = '/.netlify/functions/igdb-search';

  /**
   * Get DLC/expansions for a main game
   */
  async getDLCForGame(gameId: number): Promise<DLCGame[]> {
    try {
      console.log('🎮 Fetching DLC for game ID:', gameId);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isBulkRequest: true,
          endpoint: 'games',
          requestBody: `fields name, summary, first_release_date, cover.url, category, parent_game; where parent_game = ${gameId} & category != null & category != 0; sort first_release_date asc; limit 50;`
        })
      });

      if (!response.ok) {
        console.error('IGDB API response not ok:', response.status, response.statusText);
        return [];
      }

      const data: DLCResponse = await response.json();
      
      if (!data.success) {
        console.error('IGDB API returned error:', data.error);
        return [];
      }

      console.log('✅ Found', data.games?.length || 0, 'DLC/expansions');
      return data.games || [];

    } catch (error) {
      console.error('DLC fetch failed:', error);
      return [];
    }
  }

  /**
   * Get parent game for DLC/expansion
   */
  async getParentGame(dlcId: number): Promise<DLCGame | null> {
    try {
      console.log('🎮 Fetching parent game for DLC ID:', dlcId);

      // First get the DLC to find its parent_game ID
      const dlcResponse = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isBulkRequest: true,
          endpoint: 'games',
          requestBody: `fields parent_game; where id = ${dlcId};`
        })
      });

      if (!dlcResponse.ok) {
        console.error('IGDB API response not ok:', dlcResponse.status);
        return null;
      }

      const dlcData = await dlcResponse.json();
      
      if (!dlcData.success || !dlcData.games?.[0]?.parent_game) {
        console.log('No parent game found for DLC');
        return null;
      }

      const parentGameId = dlcData.games[0].parent_game;

      // Now fetch the parent game details
      const parentResponse = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isBulkRequest: true,
          endpoint: 'games',
          requestBody: `fields name, summary, first_release_date, cover.url, category; where id = ${parentGameId};`
        })
      });

      if (!parentResponse.ok) {
        console.error('IGDB API response not ok:', parentResponse.status);
        return null;
      }

      const parentData = await parentResponse.json();
      
      if (!parentData.success) {
        console.error('IGDB API returned error:', parentData.error);
        return null;
      }

      console.log('✅ Found parent game:', parentData.games?.[0]?.name);
      return parentData.games?.[0] || null;

    } catch (error) {
      console.error('Parent game fetch failed:', error);
      return null;
    }
  }

  /**
   * Check if a game is DLC/expansion based on category
   */
  isDLC(category: number | null | undefined): boolean {
    // DLC categories: 1 = DLC, 2 = Expansion, 3 = Bundle, 4 = Standalone Expansion
    return category !== null && category !== undefined && category !== 0;
  }

  /**
   * Get category name for display
   */
  getCategoryName(category: number | null | undefined): string {
    switch (category) {
      case 0:
      case null:
      case undefined:
        return 'Main Game';
      case 1:
        return 'DLC';
      case 2:
        return 'Expansion';
      case 3:
        return 'Bundle';
      case 4:
        return 'Standalone Expansion';
      default:
        return 'Additional Content';
    }
  }

  /**
   * Transform IGDB image URL to higher quality
   */
  transformImageUrl(url: string): string {
    if (!url) return '';
    return url.replace('t_thumb', 't_cover_big').replace('//', 'https://');
  }
}

export const dlcService = new DLCService();
export type { DLCGame };