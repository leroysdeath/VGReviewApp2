// Game seeding service for Phase 1 implementation
// Adds missing flagship games to database while respecting API limits

import { PRIORITY_GAMES_DATABASE, PriorityGame, getCriticalPriorityGames } from '../data/priorityGames';
import { igdbService } from './igdbService';
import { supabase } from './supabase';
import type { IGDBGame } from '../types/igdb';

interface SeedingResult {
  attempted: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: string[];
}

interface MissingGame {
  priorityGame: PriorityGame;
  reason: 'not_found' | 'no_results';
}

export class GameSeeder {
  private static readonly API_RATE_LIMIT_DELAY = 250; // 4 requests per second max
  private static readonly BATCH_SIZE = 5; // Process in small batches
  
  /**
   * Identify missing flagship games by checking database coverage
   */
  async identifyMissingGames(): Promise<MissingGame[]> {
    console.log('🔍 Identifying missing flagship games...');
    
    const missing: MissingGame[] = [];
    const criticalGames = getCriticalPriorityGames();
    
    for (const priorityGame of criticalGames) {
      try {
        // Check if game exists in database
        const { data, error } = await supabase
          .from('game')
          .select('id, name')
          .or(`name.ilike.%${priorityGame.name}%,${
            priorityGame.alternativeNames ? 
            priorityGame.alternativeNames.map(alt => `name.ilike.%${alt}%`).join(',') :
            ''
          }`)
          .limit(1);
        
        if (error) {
          console.warn(`Database check failed for ${priorityGame.name}:`, error);
          continue;
        }
        
        if (!data || data.length === 0) {
          missing.push({
            priorityGame,
            reason: 'not_found'
          });
          console.log(`❌ Missing: ${priorityGame.name}`);
        } else {
          console.log(`✅ Found: ${priorityGame.name}`);
        }
        
        // Rate limiting for database queries
        await this.delay(50);
        
      } catch (error) {
        console.error(`Error checking ${priorityGame.name}:`, error);
      }
    }
    
    console.log(`📊 Missing games identified: ${missing.length}/${criticalGames.length}`);
    return missing;
  }
  
  /**
   * Seed missing flagship games from IGDB (respects rate limits)
   */
  async seedMissingGames(missingGames: MissingGame[], dryRun = false): Promise<SeedingResult> {
    console.log(`🌱 ${dryRun ? 'DRY RUN' : 'SEEDING'} ${missingGames.length} missing games...`);
    
    const result: SeedingResult = {
      attempted: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    // Process in batches to respect rate limits
    const batches = this.createBatches(missingGames, GameSeeder.BATCH_SIZE);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n📦 Processing batch ${i + 1}/${batches.length}...`);
      
      for (const missing of batch) {
        result.attempted++;
        
        try {
          const success = await this.seedSingleGame(missing.priorityGame, dryRun);
          
          if (success) {
            result.successful++;
          } else {
            result.failed++;
          }
          
        } catch (error) {
          result.failed++;
          result.errors.push(`${missing.priorityGame.name}: ${error.message}`);
          console.error(`❌ Failed to seed ${missing.priorityGame.name}:`, error);
        }
        
        // Critical: Respect IGDB rate limit (4 req/sec max)
        await this.delay(GameSeeder.API_RATE_LIMIT_DELAY);
      }
      
      // Longer delay between batches
      if (i < batches.length - 1) {
        console.log('⏳ Batch delay...');
        await this.delay(1000);
      }
    }
    
    console.log(`\n✅ Seeding complete:`);
    console.log(`   Attempted: ${result.attempted}`);
    console.log(`   Successful: ${result.successful}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   Success rate: ${((result.successful / result.attempted) * 100).toFixed(1)}%`);
    
    return result;
  }
  
  /**
   * Seed a single game from IGDB
   */
  private async seedSingleGame(priorityGame: PriorityGame, dryRun: boolean): Promise<boolean> {
    try {
      console.log(`🔍 Searching IGDB for: ${priorityGame.name}`);
      
      // Search IGDB for the game
      const igdbGames = await igdbService.searchGames(priorityGame.name, 5);
      
      if (!igdbGames || igdbGames.length === 0) {
        console.log(`   ⚠️ No IGDB results found`);
        return false;
      }
      
      // Find best match
      const bestMatch = this.findBestMatch(igdbGames, priorityGame);
      
      if (!bestMatch) {
        console.log(`   ⚠️ No suitable match found in IGDB results`);
        return false;
      }
      
      console.log(`   ✅ Best match: "${bestMatch.name}" (${bestMatch.first_release_date})`);
      
      if (dryRun) {
        console.log(`   🧪 DRY RUN - Would add to database`);
        return true;
      }
      
      // Add to database
      const success = await this.addGameToDatabase(bestMatch, priorityGame);
      
      if (success) {
        console.log(`   💾 Added to database successfully`);
      } else {
        console.log(`   ❌ Failed to add to database`);
      }
      
      return success;
      
    } catch (error) {
      console.error(`   ❌ Error seeding ${priorityGame.name}:`, error);
      return false;
    }
  }
  
  /**
   * Find best match from IGDB results
   */
  private findBestMatch(igdbGames: IGDBGame[], priorityGame: PriorityGame): IGDBGame | null {
    let bestMatch: IGDBGame | null = null;
    let bestScore = 0;
    
    for (const game of igdbGames) {
      let score = 0;
      const gameName = game.name?.toLowerCase() || '';
      const priorityName = priorityGame.name.toLowerCase();
      
      // Exact name match
      if (gameName === priorityName) {
        score += 100;
      }
      
      // Partial name match
      if (gameName.includes(priorityName) || priorityName.includes(gameName)) {
        score += 50;
      }
      
      // Alternative name match
      if (priorityGame.alternativeNames) {
        for (const altName of priorityGame.alternativeNames) {
          const altLower = altName.toLowerCase();
          if (gameName === altLower) {
            score += 80;
          } else if (gameName.includes(altLower) || altLower.includes(gameName)) {
            score += 30;
          }
        }
      }
      
      // Release year match (within 2 years)
      if (game.first_release_date) {
        const gameYear = new Date(game.first_release_date * 1000).getFullYear();
        const yearDiff = Math.abs(gameYear - priorityGame.release_year);
        if (yearDiff <= 2) {
          score += 20;
        }
      }
      
      // Platform match
      if (game.platforms && priorityGame.platforms.length > 0) {
        const platformMatch = game.platforms.some(platform => 
          priorityGame.platforms.some(pp => 
            platform.name?.toLowerCase().includes(pp.toLowerCase()) ||
            pp.toLowerCase().includes(platform.name?.toLowerCase() || '')
          )
        );
        if (platformMatch) {
          score += 10;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = game;
      }
    }
    
    // Only return if we have a decent match (threshold of 30)
    return bestScore >= 30 ? bestMatch : null;
  }
  
  /**
   * Add game to database with proper data transformation
   */
  private async addGameToDatabase(igdbGame: IGDBGame, priorityGame: PriorityGame): Promise<boolean> {
    try {
      // Transform IGDB game to database format
      const gameData = {
        igdb_id: igdbGame.id,
        game_id: igdbGame.id.toString(),
        name: igdbGame.name,
        slug: this.generateSlug(igdbGame.name),
        summary: igdbGame.summary || null,
        release_date: igdbGame.first_release_date ? 
          new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0] : null,
        cover_url: igdbGame.cover?.url ? 
          (igdbGame.cover.url.startsWith('//') ? `https:${igdbGame.cover.url}` : igdbGame.cover.url)
            .replace('t_thumb', 't_cover_big') : null,
        genres: igdbGame.genres?.map(g => g.name) || [],
        platforms: igdbGame.platforms?.map(p => p.name) || [],
        screenshots: igdbGame.screenshots?.map(s => s.url) || [],
        videos: [],
        developer: igdbGame.involved_companies?.find(c => c.developer)?.company.name || null,
        publisher: igdbGame.involved_companies?.find(c => c.publisher)?.company.name || null,
        igdb_rating: Math.round(igdbGame.rating || 0),
        category: igdbGame.category || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Insert into database
      const { data, error } = await supabase
        .from('game')
        .insert(gameData)
        .select('id')
        .single();
      
      if (error) {
        console.error('Database insert error:', error);
        return false;
      }
      
      console.log(`   📝 Game added with ID: ${data.id}`);
      return true;
      
    } catch (error) {
      console.error('Error adding game to database:', error);
      return false;
    }
  }
  
  /**
   * Utility: Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
  
  /**
   * Utility: Generate URL-friendly slug from game name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens and spaces
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Run complete seeding process
   */
  async runSeeding(dryRun = true): Promise<SeedingResult> {
    console.log(`🚀 Starting game seeding process (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
    
    try {
      // Step 1: Identify missing games
      const missingGames = await this.identifyMissingGames();
      
      if (missingGames.length === 0) {
        console.log('✅ All critical flagship games are present in database!');
        return {
          attempted: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          errors: []
        };
      }
      
      // Step 2: Seed missing games
      const result = await this.seedMissingGames(missingGames, dryRun);
      
      return result;
      
    } catch (error) {
      console.error('❌ Seeding process failed:', error);
      throw error;
    }
  }
}