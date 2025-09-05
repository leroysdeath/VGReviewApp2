import { igdbService } from './igdbService';
import { gameSyncService } from './gameSyncService';
import { IGDBGame } from '../types/igdb';

/**
 * Service for preloading popular games into the database
 * Implements a tier system for progressive loading
 */
class GamePreloadService {
  // Tier 1: Core franchises that cover 40% of searches
  private readonly TIER_1_FRANCHISES = [
    // Nintendo Classics
    'Mario', 'Zelda', 'Pokemon', 'Metroid', 'Kirby', 'Donkey Kong',
    
    // Action/Shooter Franchises
    'Call of Duty', 'Battlefield', 'Halo', 'Doom', 'Overwatch', 'Apex Legends',
    'Counter-Strike', 'Valorant', 'Fortnite', 'PUBG',
    
    // RPG Giants
    'Final Fantasy', 'Elder Scrolls', 'Witcher', 'Dragon Age', 'Mass Effect',
    'Persona', 'Dark Souls', 'Elden Ring', 'Baldurs Gate',
    
    // Sports (Annual Releases)
    'FIFA', 'NBA 2K', 'Madden NFL', 'MLB The Show', 'NHL',
    
    // Open World/Sandbox
    'Grand Theft Auto', 'GTA', 'Red Dead', 'Minecraft', 'Roblox',
    
    // Sony Exclusives
    'God of War', 'Last of Us', 'Uncharted', 'Spider-Man', 'Horizon',
    
    // Fighting Games
    'Street Fighter', 'Mortal Kombat', 'Tekken', 'Super Smash Bros',
    
    // Racing
    'Gran Turismo', 'Forza', 'Need for Speed', 'Mario Kart',
  ];

  // Tier 2: Popular modern games and ongoing services
  private readonly TIER_2_MODERN = [
    // 2023-2024 Hits
    'Hogwarts Legacy', 'Starfield', 'Diablo 4', 'Armored Core',
    'Tears of the Kingdom', 'Alan Wake 2', 'Cyberpunk 2077',
    'Helldivers 2', 'Palworld', 'Lethal Company',
    
    // Ongoing Live Services
    'Destiny', 'Genshin Impact', 'League of Legends', 'Dota 2',
    'World of Warcraft', 'Final Fantasy XIV', 'Lost Ark',
    
    // Indie Darlings
    'Hades', 'Hollow Knight', 'Stardew Valley', 'Celeste',
    'Terraria', 'Among Us', 'Fall Guys', 'Vampire Survivors',
    
    // Horror
    'Resident Evil', 'Silent Hill', 'Dead Space', 'Outlast',
    
    // Strategy
    'Civilization', 'Total War', 'XCOM', 'Crusader Kings',
    'Age of Empires', 'StarCraft', 'Command & Conquer',
  ];

  // Tier 3: Legacy and retro games
  private readonly TIER_3_LEGACY = [
    // Retro Franchises
    'Sonic', 'Mega Man', 'Castlevania', 'Metal Gear',
    'Pac-Man', 'Tetris', 'Space Invaders',
    
    // Classic RPGs
    'Chrono Trigger', 'Secret of Mana', 'Earthbound',
    'Fallout', 'Diablo', 'Baldurs Gate', 'Planescape',
    
    // PC Classics
    'Half-Life', 'Portal', 'Team Fortress', 'Left 4 Dead',
    'Bioshock', 'System Shock', 'Deus Ex',
    
    // PlayStation Era
    'Crash Bandicoot', 'Spyro', 'Ratchet Clank', 'Jak and Daxter',
    'Kingdom Hearts', 'Devil May Cry', 'Metal Gear Solid',
  ];

  // Search variations for common abbreviations
  private readonly SEARCH_VARIATIONS: Record<string, string[]> = {
    'GTA': ['Grand Theft Auto', 'GTA'],
    'CoD': ['Call of Duty', 'COD', 'CallOfDuty'],
    'CS': ['Counter-Strike', 'CS:GO', 'CS2', 'Counter Strike'],
    'LoL': ['League of Legends', 'LoL', 'League'],
    'WoW': ['World of Warcraft', 'WoW', 'Warcraft'],
    'PUBG': ['PUBG', 'PlayerUnknowns Battlegrounds', 'Battlegrounds'],
    'R6': ['Rainbow Six', 'R6', 'Rainbow 6', 'Siege'],
    'FF': ['Final Fantasy', 'FF'],
  };

  private isPreloading = false;
  private preloadInterval: NodeJS.Timeout | null = null;

  /**
   * Start the progressive preloading process
   */
  async startPreloading(): Promise<void> {
    if (this.isPreloading) {
      console.log('⚠️ Preloading already in progress');
      return;
    }

    this.isPreloading = true;
    console.log('🚀 Starting game preloading service...');

    try {
      // Check database size first
      const gameCount = await gameSyncService.getDatabaseGameCount();
      console.log(`📊 Current database has ${gameCount} games`);

      if (gameCount < 100) {
        // Bootstrap essential games if database is nearly empty
        console.log('📦 Database is empty, bootstrapping essential games...');
        await this.bootstrapEssentialGames();
      }

      // Progressive loading schedule
      await this.executeProgressiveLoading();

      // Set up continuous updates (every hour)
      this.setupContinuousUpdates();

    } catch (error) {
      console.error('❌ Error during preloading:', error);
      this.isPreloading = false;
    }
  }

  /**
   * Bootstrap essential games for empty database
   */
  async bootstrapEssentialGames(): Promise<void> {
    console.log('🎮 Bootstrapping top 5 essential franchises...');
    
    const essentialGames = [
      'Mario', 'Zelda', 'Call of Duty', 'Minecraft', 'Grand Theft Auto'
    ];

    await this.preloadBatch(essentialGames, 20);
  }

  /**
   * Execute progressive loading based on tiers
   */
  private async executeProgressiveLoading(): Promise<void> {
    // Immediate (0-10 seconds): Ultra-critical
    console.log('📊 Phase 1: Loading ultra-critical games...');
    await this.preloadBatch(this.TIER_1_FRANCHISES.slice(0, 5), 20);

    // Fast (30 seconds): Very popular
    setTimeout(async () => {
      if (!this.isPreloading) return;
      console.log('📊 Phase 2: Loading very popular franchises...');
      await this.preloadBatch(this.TIER_1_FRANCHISES.slice(5, 20), 15);
    }, 30000);

    // Standard (2 minutes): Popular
    setTimeout(async () => {
      if (!this.isPreloading) return;
      console.log('📊 Phase 3: Loading popular modern games...');
      await this.preloadBatch([
        ...this.TIER_1_FRANCHISES.slice(20),
        ...this.TIER_2_MODERN.slice(0, 20)
      ], 10);
    }, 120000);

    // Background (5 minutes): Everything else
    setTimeout(async () => {
      if (!this.isPreloading) return;
      console.log('📊 Phase 4: Loading remaining catalog...');
      await this.preloadBatch([
        ...this.TIER_2_MODERN.slice(20),
        ...this.TIER_3_LEGACY
      ], 10);
    }, 300000);

    // Annual releases (10 minutes)
    setTimeout(async () => {
      if (!this.isPreloading) return;
      console.log('📊 Phase 5: Loading annual releases...');
      await this.preloadAnnualReleases();
    }, 600000);
  }

  /**
   * Set up continuous updates for trending games
   */
  private setupContinuousUpdates(): void {
    // Update trending games every hour
    this.preloadInterval = setInterval(async () => {
      if (!this.isPreloading) return;
      console.log('🔄 Updating trending games...');
      await this.preloadTrendingGames();
    }, 3600000); // 1 hour
  }

  /**
   * Preload a batch of game searches
   */
  private async preloadBatch(queries: string[], limit: number): Promise<void> {
    console.log(`📦 Preloading batch of ${queries.length} queries...`);
    
    for (const query of queries) {
      if (!this.isPreloading) break;

      try {
        console.log(`  🔍 Searching for: ${query} (limit: ${limit})`);
        const games = await igdbService.searchGames(query, { limit });
        
        if (games && games.length > 0) {
          await gameSyncService.saveGamesFromIGDB(games);
          console.log(`  ✅ Saved ${games.length} games for "${query}"`);
        } else {
          console.log(`  ⚠️ No games found for "${query}"`);
        }

        // Rate limiting delay
        await this.delay(2000);
      } catch (error) {
        console.error(`  ❌ Failed to preload "${query}":`, error);
        // Continue with next query even if one fails
      }
    }
  }

  /**
   * Preload annual sports releases
   */
  private async preloadAnnualReleases(): Promise<void> {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    
    // Use franchise names instead of specific years to avoid 400 errors
    const annualReleases = [
      'FIFA',           // Generic search finds latest available
      'NBA 2K',         // Generic search finds latest available  
      'Madden NFL',     // Generic search finds latest available
      'MLB The Show',   // Generic search finds latest available
      'NHL',            // Generic search finds latest available
      'Call of Duty',   // Already generic
      'EA FC',          // EA Sports FC (new FIFA branding)
    ];

    await this.preloadBatch(annualReleases, 15);
  }

  /**
   * Fetch and save currently trending games
   */
  private async preloadTrendingGames(): Promise<void> {
    try {
      // This would ideally use a trending endpoint from IGDB
      // For now, we'll search for games with high recent activity
      const trendingQueries = [
        'popular',
        'trending',
        'new releases',
        'upcoming',
      ];

      for (const query of trendingQueries) {
        const games = await igdbService.searchGames(query, { 
          limit: 20,
          // Add any trending-specific filters here
        });

        if (games && games.length > 0) {
          await gameSyncService.saveGamesFromIGDB(games);
        }

        await this.delay(3000); // Rate limiting
      }
    } catch (error) {
      console.error('Error preloading trending games:', error);
    }
  }

  /**
   * Preload games based on user search history
   */
  async preloadBasedOnUserHistory(): Promise<void> {
    try {
      // Get popular search terms from localStorage or analytics
      const searchHistory = this.getSearchHistory();
      const popularSearches = this.extractPopularSearches(searchHistory);

      if (popularSearches.length > 0) {
        console.log(`📊 Preloading ${popularSearches.length} popular searches from history`);
        await this.preloadBatch(popularSearches.slice(0, 20), 10);
      }
    } catch (error) {
      console.error('Error preloading from user history:', error);
    }
  }

  /**
   * Get search history from localStorage
   */
  private getSearchHistory(): string[] {
    try {
      const history = localStorage.getItem('gameSearchHistory');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }

  /**
   * Extract popular searches from history
   */
  private extractPopularSearches(history: string[]): string[] {
    const searchCounts = new Map<string, number>();

    // Count occurrences
    history.forEach(search => {
      const normalized = search.toLowerCase().trim();
      searchCounts.set(normalized, (searchCounts.get(normalized) || 0) + 1);
    });

    // Sort by frequency and return top searches
    return Array.from(searchCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([search]) => search)
      .slice(0, 50);
  }

  /**
   * Preload games for a specific franchise
   */
  async preloadFranchise(franchiseName: string): Promise<void> {
    try {
      console.log(`🎮 Preloading entire ${franchiseName} franchise...`);
      
      // Search for all games in the franchise
      const games = await igdbService.searchGames(franchiseName, { 
        limit: 100 // Get more games for franchises
      });

      if (games && games.length > 0) {
        await gameSyncService.saveGamesFromIGDB(games);
        console.log(`✅ Saved ${games.length} games from ${franchiseName} franchise`);
      }
    } catch (error) {
      console.error(`Error preloading franchise ${franchiseName}:`, error);
    }
  }

  /**
   * Stop the preloading service
   */
  stopPreloading(): void {
    console.log('🛑 Stopping preload service...');
    this.isPreloading = false;

    if (this.preloadInterval) {
      clearInterval(this.preloadInterval);
      this.preloadInterval = null;
    }
  }

  /**
   * Check if preloading is active
   */
  isActive(): boolean {
    return this.isPreloading;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get preload statistics
   */
  async getStatistics(): Promise<{
    isActive: boolean;
    databaseGameCount: number;
    tier1Coverage: number;
    tier2Coverage: number;
    tier3Coverage: number;
  }> {
    const gameCount = await gameSyncService.getDatabaseGameCount();

    return {
      isActive: this.isPreloading,
      databaseGameCount: gameCount,
      tier1Coverage: Math.min(100, (gameCount / 500) * 100), // Estimate
      tier2Coverage: Math.min(100, (gameCount / 1500) * 100), // Estimate
      tier3Coverage: Math.min(100, (gameCount / 3000) * 100), // Estimate
    };
  }
}

// Export singleton instance
export const gamePreloadService = new GamePreloadService();