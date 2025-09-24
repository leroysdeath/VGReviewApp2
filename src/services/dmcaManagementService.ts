/**
 * DMCA Management Service
 * 
 * Provides bulk operations for redlighting games from specific companies or mod categories
 * to handle DMCA takedown requests efficiently.
 */

import { supabase } from './supabase';
import { gameFlagService, type FlagType } from './gameFlagService';

export interface CompanyGames {
  company: string;
  gameCount: number;
  sampleGames: string[];
  isPublisher: boolean;
  isDeveloper: boolean;
}

export interface BulkFlagRequest {
  type: 'company' | 'mods' | 'category';
  target: string; // Company name or category
  flagType: 'redlight' | 'clear';
  reason: string;
  dryRun?: boolean; // Preview mode
}

export interface BulkFlagResult {
  success: boolean;
  processedCount: number;
  skippedCount: number;
  errorCount: number;
  affectedGames: Array<{
    id: number;
    name: string;
    action: 'flagged' | 'cleared' | 'skipped' | 'error';
    reason?: string;
  }>;
  error?: string;
}

export interface CompanyAnalysis {
  publishers: CompanyGames[];
  developers: CompanyGames[];
  totalCompanies: number;
  totalGames: number;
}

class DMCAManagementService {
  /**
   * Get analysis of all companies in the database
   */
  async getCompanyAnalysis(): Promise<{ success: boolean; data?: CompanyAnalysis; error?: string }> {
    try {
      const { data: games, error } = await supabase
        .from('game')
        .select('id, name, publisher, developer')
        .not('publisher', 'is', null)
        .not('developer', 'is', null);

      if (error) {
        return { success: false, error: error.message };
      }

      if (!games) {
        return { success: false, error: 'No games found' };
      }

      // Analyze publishers
      const publisherMap = new Map<string, Array<{ id: number; name: string }>>();
      const developerMap = new Map<string, Array<{ id: number; name: string }>>();

      games.forEach(game => {
        if (game.publisher && game.publisher.trim() && game.publisher !== 'Unknown') {
          const publisher = game.publisher.trim();
          if (!publisherMap.has(publisher)) {
            publisherMap.set(publisher, []);
          }
          publisherMap.get(publisher)!.push({ id: game.id, name: game.name });
        }

        if (game.developer && game.developer.trim() && game.developer !== 'Unknown') {
          const developer = game.developer.trim();
          if (!developerMap.has(developer)) {
            developerMap.set(developer, []);
          }
          developerMap.get(developer)!.push({ id: game.id, name: game.name });
        }
      });

      // Convert to sorted arrays
      const publishers: CompanyGames[] = Array.from(publisherMap.entries())
        .map(([company, games]) => ({
          company,
          gameCount: games.length,
          sampleGames: games.slice(0, 5).map(g => g.name),
          isPublisher: true,
          isDeveloper: false
        }))
        .sort((a, b) => b.gameCount - a.gameCount);

      const developers: CompanyGames[] = Array.from(developerMap.entries())
        .map(([company, games]) => ({
          company,
          gameCount: games.length,
          sampleGames: games.slice(0, 5).map(g => g.name),
          isPublisher: false,
          isDeveloper: true
        }))
        .sort((a, b) => b.gameCount - a.gameCount);

      return {
        success: true,
        data: {
          publishers,
          developers,
          totalCompanies: publisherMap.size + developerMap.size,
          totalGames: games.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get games from a specific company with pagination and timeout handling
   */
  async getCompanyGames(
    company: string,
    type: 'publisher' | 'developer',
    limit: number = 1000
  ): Promise<{ success: boolean; data?: Array<{ id: number; name: string; category?: number }>; error?: string }> {
    try {
      const column = type === 'publisher' ? 'publisher' : 'developer';
      
      console.log(`🔍 Searching for ${type} "${company}" (limit: ${limit})`);
      
      // Add timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000);
      });

      const queryPromise = supabase
        .from('game')
        .select('id, name, category, publisher, developer, greenlight_flag, redlight_flag')
        .ilike(column, `%${company}%`)
        .limit(limit)
        .order('id'); // Add consistent ordering

      const { data: games, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error(`❌ Query error for ${company}:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`✅ Found ${games?.length || 0} games for ${company}`);

      return {
        success: true,
        data: games || []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Exception for ${company}:`, errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get mod games (category 5)
   */
  async getModGames(): Promise<{ success: boolean; data?: Array<{ id: number; name: string; developer?: string; publisher?: string }>; error?: string }> {
    try {
      const { data: games, error } = await supabase
        .from('game')
        .select('id, name, developer, publisher, greenlight_flag, redlight_flag')
        .eq('category', 5); // Mod category

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: games || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Perform bulk flagging operation
   */
  async bulkFlag(request: BulkFlagRequest): Promise<BulkFlagResult> {
    try {
      let targetGames: Array<{ id: number; name: string; category?: number }> = [];

      // Get target games based on request type
      if (request.type === 'company') {
        // Parse company request (could be "Nintendo (Publisher)" or "Nintendo (Developer)")
        const match = request.target.match(/^(.+?)\s*\((Publisher|Developer)\)$/);
        if (!match) {
          return {
            success: false,
            processedCount: 0,
            skippedCount: 0,
            errorCount: 0,
            affectedGames: [],
            error: 'Invalid company format. Expected: "Company Name (Publisher)" or "Company Name (Developer)"'
          };
        }

        const [, company, type] = match;
        const companyResult = await this.getCompanyGames(company, type.toLowerCase() as 'publisher' | 'developer');
        
        if (!companyResult.success) {
          return {
            success: false,
            processedCount: 0,
            skippedCount: 0,
            errorCount: 0,
            affectedGames: [],
            error: companyResult.error
          };
        }

        targetGames = companyResult.data || [];
      } else if (request.type === 'mods') {
        const modResult = await this.getModGames();
        
        if (!modResult.success) {
          return {
            success: false,
            processedCount: 0,
            skippedCount: 0,
            errorCount: 0,
            affectedGames: [],
            error: modResult.error
          };
        }

        targetGames = modResult.data || [];
      } else {
        return {
          success: false,
          processedCount: 0,
          skippedCount: 0,
          errorCount: 0,
          affectedGames: [],
          error: 'Unsupported request type'
        };
      }

      if (request.dryRun) {
        // Return preview without making changes
        console.log(`🔍 DRY RUN: Would affect ${targetGames.length} games`);
        
        const previewLimit = Math.min(20, targetGames.length); // Show up to 20 in preview
        const preview = targetGames.slice(0, previewLimit).map(game => ({
          id: game.id,
          name: game.name,
          action: request.flagType === 'clear' ? 'cleared' as const : 'flagged' as const,
          reason: `[DRY RUN] Would ${request.flagType} - ${request.reason}`
        }));

        // Add summary info for large datasets
        if (targetGames.length > previewLimit) {
          preview.push({
            id: 0,
            name: `... and ${targetGames.length - previewLimit} more games`,
            action: 'flagged' as const,
            reason: `Total games that would be affected: ${targetGames.length}`
          });
        }

        return {
          success: true,
          processedCount: 0,
          skippedCount: 0,
          errorCount: 0,
          affectedGames: preview
        };
      }

      // Perform actual flagging with chunked processing
      const affectedGames: BulkFlagResult['affectedGames'] = [];
      let processedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      const CHUNK_SIZE = 100; // Process in chunks of 100
      const chunks = [];
      
      // Split into chunks
      for (let i = 0; i < targetGames.length; i += CHUNK_SIZE) {
        chunks.push(targetGames.slice(i, i + CHUNK_SIZE));
      }

      console.log(`🔄 Processing ${targetGames.length} games in ${chunks.length} chunks of ${CHUNK_SIZE}`);

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        console.log(`📦 Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} games)`);

        for (const game of chunk) {
          try {
            const flagType: FlagType = request.flagType === 'clear' ? 'clear' : 'redlight';
            const result = await gameFlagService.setGameFlag(game.id, flagType, request.reason);

            if (result.success) {
              affectedGames.push({
                id: game.id,
                name: game.name,
                action: request.flagType === 'clear' ? 'cleared' : 'flagged',
                reason: request.reason
              });
              processedCount++;
            } else {
              affectedGames.push({
                id: game.id,
                name: game.name,
                action: 'error',
                reason: result.error
              });
              errorCount++;
            }
          } catch (error) {
            affectedGames.push({
              id: game.id,
              name: game.name,
              action: 'error',
              reason: error instanceof Error ? error.message : 'Unknown error'
            });
            errorCount++;
          }

          // Small delay between individual operations
          await new Promise(resolve => setTimeout(resolve, 25));
        }

        // Longer delay between chunks to be database-friendly
        if (chunkIndex < chunks.length - 1) {
          console.log(`⏸️ Waiting 2 seconds before next chunk...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`✅ Bulk operation completed: ${processedCount} processed, ${errorCount} errors`);

      return {
        success: true,
        processedCount,
        skippedCount,
        errorCount,
        affectedGames
      };
    } catch (error) {
      return {
        success: false,
        processedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        affectedGames: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get statistics about flagged games
   */
  async getFlagStatistics(): Promise<{
    success: boolean;
    data?: {
      totalGames: number;
      redlightCount: number;
      greenlightCount: number;
      unflaggedCount: number;
      modGamesCount: number;
      redlightedModsCount: number;
    };
    error?: string;
  }> {
    try {
      // Get total count and flag distribution
      const { data: games, error } = await supabase
        .from('game')
        .select('id, category, greenlight_flag, redlight_flag');

      if (error) {
        return { success: false, error: error.message };
      }

      if (!games) {
        return { success: false, error: 'No games found' };
      }

      let redlightCount = 0;
      let greenlightCount = 0;
      let unflaggedCount = 0;
      let modGamesCount = 0;
      let redlightedModsCount = 0;

      games.forEach(game => {
        if (game.greenlight_flag) {
          greenlightCount++;
        } else if (game.redlight_flag) {
          redlightCount++;
        } else {
          unflaggedCount++;
        }

        if (game.category === 5) {
          modGamesCount++;
          if (game.redlight_flag) {
            redlightedModsCount++;
          }
        }
      });

      return {
        success: true,
        data: {
          totalGames: games.length,
          redlightCount,
          greenlightCount,
          unflaggedCount,
          modGamesCount,
          redlightedModsCount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const dmcaManagementService = new DMCAManagementService();