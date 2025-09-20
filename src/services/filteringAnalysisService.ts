import { filterProtectedContent, filterFanGamesAndEReaderContent } from '../utils/contentProtectionFilter';
import type { Game } from '../types/database';

export interface FilteringReason {
  type: 'copyright' | 'category' | 'content' | 'quality' | 'name' | 'publisher' | 'relevance';
  severity: 'blocked' | 'filtered' | 'warning' | 'passed';
  title: string;
  description: string;
  recommendation?: string;
}

export interface FilteringAnalysis {
  wouldBeFiltered: boolean;
  wouldPass: boolean;
  reasons: FilteringReason[];
  summary: string;
  qualityExemption?: boolean;
  adminOverride?: 'greenlight' | 'redlight' | null;
}

class FilteringAnalysisService {
  
  analyzeGame(game: Game, searchContext?: string): FilteringAnalysis {
    const reasons: FilteringReason[] = [];
    let wouldPass = true;
    let qualityExemption = false;
    
    // Check admin overrides first
    const adminOverride = this.checkAdminOverrides(game, reasons);
    if (adminOverride) {
      return {
        wouldBeFiltered: adminOverride === 'redlight',
        wouldPass: adminOverride === 'greenlight',
        reasons,
        summary: adminOverride === 'greenlight' ? 
          'Game manually approved by admin' : 
          'Game manually blocked by admin',
        adminOverride
      };
    }
    
    // Check quality exemptions
    qualityExemption = this.checkQualityExemptions(game, reasons);
    
    // Check copyright filtering
    this.checkCopyrightFiltering(game, searchContext, reasons);
    
    // Check category filtering
    this.checkCategoryFiltering(game, reasons);
    
    // Check content protection filtering
    this.checkContentFiltering(game, reasons);
    
    // Check name-based filtering
    this.checkNameFiltering(game, reasons);
    
    // Check publisher authorization
    this.checkPublisherAuthorization(game, searchContext, reasons);
    
    // Determine if game would be filtered
    const blockingReasons = reasons.filter(r => r.severity === 'blocked' || r.severity === 'filtered');
    const hasQualityOverride = qualityExemption && game.category === 0;
    
    wouldPass = blockingReasons.length === 0 || hasQualityOverride;
    
    // Generate summary
    const summary = this.generateSummary(game, reasons, qualityExemption, wouldPass);
    
    return {
      wouldBeFiltered: !wouldPass,
      wouldPass,
      reasons,
      summary,
      qualityExemption,
      adminOverride: null
    };
  }
  
  private checkAdminOverrides(game: Game, reasons: FilteringReason[]): 'greenlight' | 'redlight' | null {
    if (game.greenlight_flag) {
      reasons.push({
        type: 'publisher',
        severity: 'passed',
        title: '✅ Admin Greenlight',
        description: 'Game has been manually approved by an administrator',
        recommendation: 'This game will always appear in search results'
      });
      return 'greenlight';
    }
    
    if (game.redlight_flag) {
      reasons.push({
        type: 'publisher',
        severity: 'blocked',
        title: '🚫 Admin Redlight',
        description: `Game has been manually blocked by an administrator: ${game.flag_reason || 'No reason provided'}`,
        recommendation: 'This game will never appear in search results'
      });
      return 'redlight';
    }
    
    return null;
  }
  
  private checkQualityExemptions(game: Game, reasons: FilteringReason[]): boolean {
    const hasHighRating = game.total_rating && game.total_rating > 70;
    const hasEnoughReviews = game.rating_count && game.rating_count > 50;
    const isVeryPopular = game.follows && game.follows > 1000;
    
    const hasHighQuality = hasHighRating && hasEnoughReviews;
    const hasStrongMetrics = hasHighQuality || isVeryPopular;
    
    if (hasStrongMetrics) {
      reasons.push({
        type: 'quality',
        severity: 'passed',
        title: '⭐ Quality Exemption',
        description: `High-quality game: ${hasHighQuality ? `${game.total_rating}★ (${game.rating_count} reviews)` : ''} ${isVeryPopular ? `${game.follows?.toLocaleString()} followers` : ''}`,
        recommendation: 'Quality games bypass most filtering rules'
      });
      return true;
    }
    
    return false;
  }
  
  private checkCopyrightFiltering(game: Game, searchContext: string = '', reasons: FilteringReason[]) {
    const companies = [game.developer, game.publisher].filter(Boolean);
    
    // Simulate copyright level detection (simplified version)
    const hasNintendoFranchise = this.detectFranchiseOwnership(game.name, searchContext, 'Nintendo');
    const hasCapcomFranchise = this.detectFranchiseOwnership(game.name, searchContext, 'Capcom');
    const hasSquareEnixFranchise = this.detectFranchiseOwnership(game.name, searchContext, 'Square Enix');
    
    if (hasNintendoFranchise && !companies.some(c => c?.toLowerCase().includes('nintendo'))) {
      reasons.push({
        type: 'copyright',
        severity: 'warning',
        title: '⚠️ Nintendo Franchise Detected',
        description: `Game appears to be related to Nintendo franchises but not published by Nintendo`,
        recommendation: 'Verify if this is an official Nintendo release or authorized content'
      });
    }
    
    if (hasCapcomFranchise && !companies.some(c => c?.toLowerCase().includes('capcom'))) {
      reasons.push({
        type: 'copyright',
        severity: 'warning',
        title: '⚠️ Capcom Franchise Detected',
        description: `Game appears to be related to Capcom franchises but not published by Capcom`,
        recommendation: 'Check if this is an official Capcom release'
      });
    }
    
    if (hasSquareEnixFranchise && !companies.some(c => c?.toLowerCase().includes('square'))) {
      reasons.push({
        type: 'copyright',
        severity: 'warning',
        title: '⚠️ Square Enix Franchise Detected',
        description: `Game appears to be related to Square Enix franchises but not published by Square Enix`,
        recommendation: 'Verify official Square Enix release status'
      });
    }
  }
  
  private checkCategoryFiltering(game: Game, reasons: FilteringReason[]) {
    const categoryReasons: Record<number, { title: string; description: string; severity: FilteringReason['severity'] }> = {
      5: {
        title: '🚫 Mod Content',
        description: 'Game is categorized as a mod (IGDB Category 5)',
        severity: 'blocked'
      },
      1: {
        title: '📦 DLC Content',
        description: 'Game is categorized as DLC/Add-on content',
        severity: 'filtered'
      },
      3: {
        title: '📚 Bundle/Collection',
        description: 'Game is categorized as a bundle or collection',
        severity: 'filtered'
      },
      9: {
        title: '✨ Remaster',
        description: 'Game is categorized as a remaster',
        severity: 'filtered'
      },
      11: {
        title: '🔄 Port',
        description: 'Game is categorized as a port',
        severity: 'filtered'
      },
      13: {
        title: '📦 Pack/Collection',
        description: 'Game is categorized as a pack or collection',
        severity: 'filtered'
      }
    };
    
    if (game.category && categoryReasons[game.category]) {
      const categoryInfo = categoryReasons[game.category];
      reasons.push({
        type: 'category',
        severity: categoryInfo.severity,
        title: categoryInfo.title,
        description: categoryInfo.description,
        recommendation: categoryInfo.severity === 'blocked' ? 
          'Mods are completely blocked from search results' :
          'This type of content is filtered to reduce clutter in search results'
      });
    }
  }
  
  private checkContentFiltering(game: Game, reasons: FilteringReason[]) {
    // Test actual filter functions
    const passesContentFilter = filterProtectedContent([game]).length > 0;
    const passesFanGameFilter = filterFanGamesAndEReaderContent([game]).length > 0;
    
    if (!passesContentFilter) {
      reasons.push({
        type: 'content',
        severity: 'filtered',
        title: '🛡️ Content Protection Filter',
        description: 'Game filtered by content protection rules (category, bundle, or port filtering)',
        recommendation: 'Review game category and content type'
      });
    }
    
    if (!passesFanGameFilter) {
      reasons.push({
        type: 'content',
        severity: 'filtered',
        title: '🎮 Fan Game Filter',
        description: 'Game filtered by fan game and E-Reader content detection',
        recommendation: 'Check if this is official content or fan-made'
      });
    }
  }
  
  private checkNameFiltering(game: Game, reasons: FilteringReason[]) {
    const name = game.name.toLowerCase();
    const modIndicators = ['mod', 'hack', 'rom hack', 'romhack', 'fan game', 'fangame', 'homebrew', 'unofficial'];
    const collectionIndicators = ['collection', 'compilation', 'anthology', 'bundle', 'trilogy'];
    
    const foundModIndicators = modIndicators.filter(indicator => name.includes(indicator));
    const foundCollectionIndicators = collectionIndicators.filter(indicator => name.includes(indicator));
    
    if (foundModIndicators.length > 0) {
      reasons.push({
        type: 'name',
        severity: 'blocked',
        title: '🚫 Mod Indicators in Name',
        description: `Game name contains mod indicators: ${foundModIndicators.join(', ')}`,
        recommendation: 'Names with mod indicators are blocked to prevent unofficial content'
      });
    }
    
    if (foundCollectionIndicators.length > 0) {
      reasons.push({
        type: 'name',
        severity: 'filtered',
        title: '📚 Collection Indicators in Name',
        description: `Game name suggests it's a collection: ${foundCollectionIndicators.join(', ')}`,
        recommendation: 'Collections are filtered to reduce duplicate entries'
      });
    }
  }
  
  private checkPublisherAuthorization(game: Game, searchContext: string = '', reasons: FilteringReason[]) {
    // Check if publisher matches expected company for franchise
    const expectedPublisher = this.getExpectedPublisher(game.name, searchContext);
    
    if (expectedPublisher && game.publisher && !game.publisher.toLowerCase().includes(expectedPublisher.toLowerCase())) {
      reasons.push({
        type: 'publisher',
        severity: 'warning',
        title: '⚠️ Publisher Mismatch',
        description: `Expected publisher "${expectedPublisher}" but found "${game.publisher}"`,
        recommendation: 'Verify this is an authorized release or licensing deal'
      });
    }
  }
  
  private detectFranchiseOwnership(gameName: string, searchContext: string, company: string): boolean {
    const text = `${gameName} ${searchContext}`.toLowerCase();
    
    const franchiseMap: Record<string, string[]> = {
      'Nintendo': ['mario', 'zelda', 'pokemon', 'metroid', 'donkey kong', 'star fox', 'kirby'],
      'Capcom': ['resident evil', 'mega man', 'street fighter', 'monster hunter', 'devil may cry'],
      'Square Enix': ['final fantasy', 'dragon quest', 'kingdom hearts', 'chrono trigger']
    };
    
    const franchises = franchiseMap[company] || [];
    return franchises.some(franchise => text.includes(franchise));
  }
  
  private getExpectedPublisher(gameName: string, searchContext: string): string | null {
    const text = `${gameName} ${searchContext}`.toLowerCase();
    
    if (text.includes('mario') || text.includes('zelda') || text.includes('pokemon')) return 'Nintendo';
    if (text.includes('resident evil') || text.includes('mega man')) return 'Capcom';
    if (text.includes('final fantasy') || text.includes('kingdom hearts')) return 'Square Enix';
    
    return null;
  }
  
  private generateSummary(game: Game, reasons: FilteringReason[], qualityExemption: boolean, wouldPass: boolean): string {
    if (wouldPass) {
      if (qualityExemption) {
        return `✅ Game passes (quality exemption) - High-quality game bypasses filtering rules`;
      }
      return `✅ Game passes all filters - Will appear in search results`;
    }
    
    const blockingReasons = reasons.filter(r => r.severity === 'blocked' || r.severity === 'filtered');
    if (blockingReasons.length === 1) {
      return `❌ Game filtered: ${blockingReasons[0].title}`;
    }
    
    return `❌ Game filtered by ${blockingReasons.length} rules: ${blockingReasons.map(r => r.title).join(', ')}`;
  }
}

export const filteringAnalysisService = new FilteringAnalysisService();