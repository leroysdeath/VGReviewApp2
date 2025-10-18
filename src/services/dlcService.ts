// DLC/Expansion Service - Handles fetching related content for games
import type { IGDBGame } from './igdbService';
import { shouldFilterContent } from '../utils/contentProtectionFilter';

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
  developer?: string;
  publisher?: string;
  involved_companies?: Array<{
    developer: boolean;
    publisher: boolean;
    company: {
      name: string;
    };
  }>;
}

interface DLCResponse {
  success: boolean;
  games: DLCGame[];
  error?: string;
}

class DLCService {
  private readonly endpoint = import.meta.env.DEV
    ? 'http://localhost:8888/.netlify/functions/igdb-search'
    : '/.netlify/functions/igdb-search';

  /**
   * Get DLC/expansions for a main game (official content only)
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
          // Filter for official DLC only: has parent_game, is DLC/expansion category (1-4), has cover image, and exclude user-generated content
          requestBody: `fields name, summary, first_release_date, cover.url, category, parent_game, involved_companies.company.name; where parent_game = ${gameId} & category != null & category != 0 & category < 5 & cover != null & involved_companies != null; sort first_release_date asc; limit 20;`
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

      // Additional filtering for official content
      const officialDLC = (data.games || []).filter(game => {
        // Must have a cover image
        if (!game.cover?.url) return false;
        
        // Must be proper DLC/expansion category
        if (!game.category || game.category < 1 || game.category > 4) return false;
        
        // Filter out obviously non-official content (basic heuristics)
        const name = game.name?.toLowerCase() || '';
        const skipTerms = ['mod', 'unofficial', 'fan', 'homebrew', 'patch', 'fix'];
        if (skipTerms.some(term => name.includes(term))) return false;
        
        return true;
      });

      console.log('✅ Found', officialDLC.length, 'official DLC/expansions');
      return officialDLC;

    } catch (error) {
      console.error('DLC fetch failed:', error);
      return [];
    }
  }

  /**
   * Get mods and unofficial content for a main game
   */
  async getModsForGame(gameId: number): Promise<DLCGame[]> {
    try {
      console.log('🔧 Fetching mods for game ID:', gameId);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isBulkRequest: true,
          endpoint: 'games',
          // Search for content related to the main game that appears unofficial/mod-like
          requestBody: `fields name, summary, first_release_date, cover.url, category, parent_game, involved_companies.company.name, involved_companies.developer, involved_companies.publisher; where parent_game = ${gameId} & cover != null; sort first_release_date desc; limit 30;`
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

      // Process games to extract developer/publisher info from involved_companies
      const processedGames = (data.games || []).map(game => {
        let developer = '';
        let publisher = '';
        
        if (game.involved_companies) {
          for (const company of game.involved_companies) {
            if (company.developer && company.company?.name) {
              developer = company.company.name;
            }
            if (company.publisher && company.company?.name) {
              publisher = company.company.name;
            }
          }
        }
        
        return {
          ...game,
          developer,
          publisher
        };
      });

      // Filter for potential mod/unofficial content and apply copyright filtering
      const modContent = processedGames.filter(game => {
        // Must have a cover image
        if (!game.cover?.url) return false;
        
        const name = game.name?.toLowerCase() || '';
        
        // Look for mod-like indicators in the name
        const modTerms = ['mod', 'unofficial', 'fan', 'homebrew', 'patch', 'remix', 'remaster', 'edition', 'enhanced', 'definitive'];
        const hasModTerms = modTerms.some(term => name.includes(term));
        
        // Also include games without official category or with unusual categories
        const isUnofficialCategory = !game.category || game.category > 4;
        
        // Include if it has mod terms or unusual category, but exclude obvious official content
        if (hasModTerms || isUnofficialCategory) {
          // Exclude definitely official releases
          const officialTerms = ['goty', 'game of the year', 'complete', 'legendary', 'special edition'];
          const isOfficial = officialTerms.some(term => name.includes(term));
          if (isOfficial) return false;
          
          // Apply copyright protection filter - this will filter out Nintendo fan content
          if (shouldFilterContent({
            id: game.id,
            name: game.name,
            developer: game.developer,
            publisher: game.publisher,
            category: game.category,
            summary: game.summary
          })) {
            console.log(`🛡️ Filtered mod content: "${game.name}" by ${game.developer || 'Unknown'}`);
            return false;
          }
          
          return true;
        }
        
        return false;
      });

      console.log('✅ Found', modContent.length, 'potential mod/fan content items');
      return modContent.slice(0, 15); // Limit to 15 items for performance

    } catch (error) {
      console.error('Mod fetch failed:', error);
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