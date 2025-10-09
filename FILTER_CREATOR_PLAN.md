# Filter Creator Diagnostic Tool - Implementation Plan

**Purpose:** Visual diagnostic tool for testing and tuning game filtering/sorting logic before deploying site-wide

**Core Concept:** Load 500 diverse games → Apply filters/sorting → Visualize results in real-time with green (passed) / red (filtered) boxes

---

## Architecture Overview

### 1. Filter System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Filter Creator Page                       │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Sample     │  │ Filter       │  │ Results Grid       │  │
│  │ Generator  │→ │ Engine       │→ │ (Green/Red boxes)  │  │
│  └────────────┘  └──────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
                  ┌────────────────────┐
                  │ Filter Config JSON │
                  │ (Export/Import)    │
                  └────────────────────┘
                           ↓
                  ┌────────────────────┐
                  │ Apply Site-Wide    │
                  │ (Update services)  │
                  └────────────────────┘
```

---

## Phase 1: Core Infrastructure (Week 1)

### 1.1 - Create Filter Configuration System

**File:** `src/utils/filterConfig.ts`

```typescript
/**
 * Centralized filter configuration
 * Can be exported/imported as JSON for testing
 */

export interface FilterRule {
  id: string;
  name: string;
  type: 'category' | 'content' | 'quality' | 'release' | 'custom';
  enabled: boolean;
  priority: number; // Higher = applied first
  condition: FilterCondition;
}

export interface FilterCondition {
  // Category filters
  categoryIncludes?: number[];
  categoryExcludes?: number[];

  // Content protection
  namePatterns?: string[]; // Regex patterns
  developerBlacklist?: string[];
  publisherBlacklist?: string[];

  // Quality filters
  minRating?: number;
  minRatingCount?: number;
  minFollows?: number;

  // Release status
  releaseStatuses?: ('released' | 'unreleased' | 'canceled' | 'early_access')[];

  // Platform quality
  minPlatformQuality?: number;

  // Custom function (for advanced filtering)
  customFunction?: string; // Stored as string, eval'd safely
}

export interface SortRule {
  id: string;
  name: string;
  enabled: boolean;
  field: 'priority' | 'rating' | 'follows' | 'release_date' | 'name';
  order: 'asc' | 'desc';
  weight?: number; // For multi-factor sorting
}

export interface FilterConfig {
  version: string;
  name: string;
  description: string;
  filters: FilterRule[];
  sorting: SortRule[];
  metadata: {
    createdAt: string;
    modifiedAt: string;
    appliedSiteWide: boolean;
  };
}

// Default config (current production settings)
export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  version: '1.0.0',
  name: 'Production Default',
  description: 'Current production filtering logic',
  filters: [
    {
      id: 'content-protection',
      name: 'Content Protection (ROM hacks, mods, fan games)',
      type: 'content',
      enabled: true,
      priority: 100,
      condition: {
        namePatterns: [
          'rom.*hack',
          'fan.*game',
          'mod',
          // ... existing patterns from contentProtectionFilter.ts
        ],
        developerBlacklist: ['DMCA-flagged developers'],
        publisherBlacklist: []
      }
    },
    {
      id: 'category-filter',
      name: 'Category Filter (Seasons, Updates, etc.)',
      type: 'category',
      enabled: true,
      priority: 90,
      condition: {
        categoryExcludes: [7, 14], // Season, Update
        categoryIncludes: [0, 2, 4, 8, 9, 10, 11] // Main, DLC, Expansion, etc.
      }
    },
    {
      id: 'quality-filter',
      name: 'Quality Filter (Low engagement)',
      type: 'quality',
      enabled: true,
      priority: 80,
      condition: {
        minRating: 0, // No minimum for now
        minRatingCount: 0,
        minFollows: 0
      }
    }
    // ... more filters
  ],
  sorting: [
    {
      id: 'priority-sort',
      name: 'Priority Score',
      enabled: true,
      field: 'priority',
      order: 'desc',
      weight: 1.0
    }
  ],
  metadata: {
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    appliedSiteWide: true
  }
};
```

**Actions:**
- [ ] Create `FilterConfig` type definitions
- [ ] Implement `filterConfigManager` for CRUD operations
- [ ] Add localStorage persistence for configs
- [ ] Create config export/import (JSON download/upload)

---

### 1.2 - Create Filter Engine

**File:** `src/utils/filterEngine.ts`

```typescript
/**
 * Filter engine that applies FilterConfig to game arrays
 * Tracks which filters affected which games for visualization
 */

export interface FilterResult {
  game: Game;
  passed: boolean;
  failedFilters: string[]; // IDs of failed filter rules
  priorityScore: number;
  sortScore: number;
}

export class FilterEngine {
  private config: FilterConfig;

  constructor(config: FilterConfig) {
    this.config = config;
  }

  /**
   * Apply all filters and return detailed results
   */
  applyFilters(games: Game[]): FilterResult[] {
    const results: FilterResult[] = [];

    for (const game of games) {
      const result: FilterResult = {
        game,
        passed: true,
        failedFilters: [],
        priorityScore: 0,
        sortScore: 0
      };

      // Apply each filter in priority order
      const sortedFilters = this.config.filters
        .filter(f => f.enabled)
        .sort((a, b) => b.priority - a.priority);

      for (const filter of sortedFilters) {
        if (!this.evaluateFilter(game, filter)) {
          result.passed = false;
          result.failedFilters.push(filter.id);
        }
      }

      // Calculate priority score
      result.priorityScore = this.calculatePriorityScore(game);

      // Calculate sort score
      result.sortScore = this.calculateSortScore(game);

      results.push(result);
    }

    // Sort results
    return this.sortResults(results);
  }

  private evaluateFilter(game: Game, filter: FilterRule): boolean {
    const condition = filter.condition;

    // Category filters
    if (condition.categoryExcludes?.includes(game.category || 0)) {
      return false;
    }

    if (condition.categoryIncludes &&
        !condition.categoryIncludes.includes(game.category || 0)) {
      return false;
    }

    // Content protection
    if (condition.namePatterns) {
      const gameName = game.name.toLowerCase();
      for (const pattern of condition.namePatterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(gameName)) {
          return false;
        }
      }
    }

    // Quality filters
    if (condition.minRating && (game.igdb_rating || 0) < condition.minRating) {
      return false;
    }

    if (condition.minRatingCount &&
        (game.total_rating_count || 0) < condition.minRatingCount) {
      return false;
    }

    if (condition.minFollows && (game.follows || 0) < condition.minFollows) {
      return false;
    }

    // Release status
    if (condition.releaseStatuses && game.release_status) {
      if (!condition.releaseStatuses.includes(game.release_status)) {
        return false;
      }
    }

    // Platform quality
    if (condition.minPlatformQuality && game.platform_quality) {
      if (game.platform_quality < condition.minPlatformQuality) {
        return false;
      }
    }

    // Custom function (advanced)
    if (condition.customFunction) {
      try {
        const customFn = new Function('game', condition.customFunction);
        if (!customFn(game)) {
          return false;
        }
      } catch (err) {
        console.error('Custom filter function error:', err);
      }
    }

    return true;
  }

  private calculatePriorityScore(game: Game): number {
    // Use existing gamePrioritization.ts logic
    return calculateGamePriority(game);
  }

  private calculateSortScore(game: Game): number {
    let score = 0;

    for (const sortRule of this.config.sorting.filter(s => s.enabled)) {
      const weight = sortRule.weight || 1.0;

      switch (sortRule.field) {
        case 'rating':
          score += (game.igdb_rating || 0) * weight;
          break;
        case 'follows':
          score += (game.follows || 0) * weight * 0.01; // Scale down
          break;
        case 'priority':
          score += this.calculatePriorityScore(game) * weight;
          break;
        // ... other fields
      }
    }

    return score;
  }

  private sortResults(results: FilterResult[]): FilterResult[] {
    return results.sort((a, b) => {
      // Primary: Sort score
      if (a.sortScore !== b.sortScore) {
        return b.sortScore - a.sortScore;
      }

      // Secondary: Priority score
      return b.priorityScore - a.priorityScore;
    });
  }

  /**
   * Get statistics about filter application
   */
  getStats(results: FilterResult[]) {
    const stats = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      filtered: results.filter(r => !r.passed).length,
      filterBreakdown: {} as Record<string, number>
    };

    // Count how many games each filter affected
    for (const result of results) {
      for (const filterId of result.failedFilters) {
        stats.filterBreakdown[filterId] =
          (stats.filterBreakdown[filterId] || 0) + 1;
      }
    }

    return stats;
  }
}
```

**Actions:**
- [ ] Implement `FilterEngine` class
- [ ] Add unit tests for filter evaluation
- [ ] Integrate with existing filtering utils
- [ ] Add performance monitoring (should handle 500 games < 100ms)

---

## Phase 2: Sample Data Generator (Week 1)

### 2.1 - Create Diverse Sample Generator

**File:** `src/utils/sampleGenerator.ts`

```typescript
/**
 * Generate diverse sample of 500 games for filter testing
 * Mix of popular, moderate, obscure, mods, DLC
 */

export interface SampleConfig {
  total: 500;
  distribution: {
    popular: 100;      // Top 1000 by follows
    moderate: 150;     // 1000-10000 by follows
    obscure: 150;      // < 1000 follows
    mods: 50;          // Category 5 or name patterns
    dlc: 50;           // Category 2, 4
  };
}

export class SampleGenerator {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Generate sample based on config
   */
  async generateSample(config: SampleConfig = DEFAULT_SAMPLE_CONFIG): Promise<Game[]> {
    const samples: Game[] = [];

    // 1. Popular games (high follows, high rating)
    const popular = await this.getPopularGames(config.distribution.popular);
    samples.push(...popular);

    // 2. Moderate games (mid-tier engagement)
    const moderate = await this.getModerateGames(config.distribution.moderate);
    samples.push(...moderate);

    // 3. Obscure games (low engagement but valid)
    const obscure = await this.getObscureGames(config.distribution.obscure);
    samples.push(...obscure);

    // 4. Mods/Fan games (category 5 or pattern matching)
    const mods = await this.getModGames(config.distribution.mods);
    samples.push(...mods);

    // 5. DLC/Expansions (category 2, 4)
    const dlc = await this.getDLCGames(config.distribution.dlc);
    samples.push(...dlc);

    // Shuffle to avoid visual bias
    return this.shuffle(samples);
  }

  private async getPopularGames(count: number): Promise<Game[]> {
    const { data, error } = await this.supabase
      .from('game')
      .select('*')
      .not('follows', 'is', null)
      .order('follows', { ascending: false })
      .limit(count * 2); // Get more for diversity

    if (error) throw error;

    // Randomly sample from top games to get variety
    return this.randomSample(data || [], count);
  }

  private async getModerateGames(count: number): Promise<Game[]> {
    // Games with 1000-10000 follows
    const { data, error } = await this.supabase
      .from('game')
      .select('*')
      .gte('follows', 1000)
      .lt('follows', 10000)
      .limit(count * 2);

    if (error) throw error;
    return this.randomSample(data || [], count);
  }

  private async getObscureGames(count: number): Promise<Game[]> {
    // Games with < 1000 follows or NULL follows
    const { data, error } = await this.supabase
      .from('game')
      .select('*')
      .or('follows.lt.1000,follows.is.null')
      .limit(count * 2);

    if (error) throw error;
    return this.randomSample(data || [], count);
  }

  private async getModGames(count: number): Promise<Game[]> {
    // Category 5 (mods) or name pattern matching
    const { data, error } = await this.supabase
      .from('game')
      .select('*')
      .or('category.eq.5,name.ilike.%mod%,name.ilike.%hack%')
      .limit(count * 2);

    if (error) throw error;
    return this.randomSample(data || [], count);
  }

  private async getDLCGames(count: number): Promise<Game[]> {
    // Category 2 (DLC), 4 (Expansion)
    const { data, error } = await this.supabase
      .from('game')
      .select('*')
      .in('category', [2, 4])
      .limit(count * 2);

    if (error) throw error;
    return this.randomSample(data || [], count);
  }

  private randomSample<T>(array: T[], count: number): T[] {
    const shuffled = this.shuffle([...array]);
    return shuffled.slice(0, count);
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
```

**Actions:**
- [ ] Implement sample generator
- [ ] Add caching (save samples to localStorage for consistency)
- [ ] Add "Regenerate Sample" button
- [ ] Add custom sample profiles (e.g., "Heavy Mod Testing", "Quality Focus")

---

## Phase 3: Filter Creator UI (Week 2)

### 3.1 - Page Layout

**File:** `src/pages/FilterCreatorPage.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│  Filter Creator - 500 Game Sample Test                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Left Panel (30%)   │  │ Results Grid (70%)                │  │
│  │                    │  │                                    │  │
│  │ Filter Controls:   │  │ ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐  │  │
│  │ ├─ Content Protect │  │ │🟢│🔴│🟢│🟢│🔴│🟢│🟢│🔴│🟢│🟢│  │  │
│  │ ├─ Category Filter │  │ └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘  │  │
│  │ ├─ Quality Filter  │  │ ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐  │  │
│  │ ├─ Custom Filter   │  │ │🟢│🟢│🔴│🟢│🟢│🟢│🔴│🟢│🟢│🟢│  │  │
│  │ └─ [+ Add Filter]  │  │ └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘  │  │
│  │                    │  │         ... (50 rows)             │  │
│  │ Sort Controls:     │  │                                    │  │
│  │ ├─ Priority Score  │  │ Stats:                            │  │
│  │ ├─ Rating          │  │ Total: 500                        │  │
│  │ └─ Follows         │  │ Passed: 347 (69%)                 │  │
│  │                    │  │ Filtered: 153 (31%)               │  │
│  │ [Regenerate Sample]│  │                                    │  │
│  │ [Export Config]    │  │ [Toggle View: Grid/List]          │  │
│  │ [Import Config]    │  │ [Show: All | Passed | Filtered]   │  │
│  │                    │  │                                    │  │
│  │ ┌──────────────┐   │  │                                    │  │
│  │ │Apply Site-Wide│  │  │                                    │  │
│  │ │   [DANGER]    │  │  │                                    │  │
│  │ └──────────────┘   │  │                                    │  │
│  └────────────────────┘  └──────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 - Component Structure

```
FilterCreatorPage/
├── FilterControlPanel/
│   ├── FilterRuleEditor/
│   │   ├── CategoryFilterEditor
│   │   ├── ContentFilterEditor
│   │   ├── QualityFilterEditor
│   │   └── CustomFilterEditor
│   ├── SortRuleEditor/
│   └── ConfigManager/
│       ├── ExportButton
│       ├── ImportButton
│       └── ApplySiteWideButton (DANGER)
│
└── ResultsGrid/
    ├── GameCard/ (mini version, ~50px tall)
    │   ├── Cover thumbnail
    │   ├── Name (truncated)
    │   ├── Priority score badge
    │   ├── Green/Red border
    │   └── Hover tooltip (failed filters)
    ├── StatsPanel/
    └── ViewControls/
```

### 3.3 - Game Card Design (Mini)

Each card should be very compact to show many at once:

```
┌─────────────────────────────────┐
│ 🟢 #001 | Score: 95.3           │ ← Green border if passed
│ ┌──┐ Super Mario 64             │
│ │🎮│ 1996 | N64                 │ ← Tiny cover thumbnail
│ └──┘ ⭐ 9.2 | 👥 15,234        │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🔴 #145 | Score: 12.1           │ ← Red border if filtered
│ ┌──┐ Mario 64 HD Texture Pack   │
│ │🎮│ 2020 | PC                  │
│ └──┘ ❌ Content Protection      │ ← Failed filter reason
└─────────────────────────────────┘
```

**Hover Tooltip:**
```
Game: Super Mario Bros. ROM Hack
Failed Filters:
  ✗ Content Protection (name pattern: "rom.*hack")
  ✗ Quality Filter (follows: 5 < 100)

Priority Score: 12.1
  - Category: 5 (Mod) = -50 pts
  - Follows: 5 = +0.5 pts
  - Rating: N/A = 0 pts
```

---

## Phase 4: Filter Rules Editor (Week 2)

### 4.1 - Filter Rule UI

Each filter type has a custom editor:

**Category Filter Editor:**
```
┌──────────────────────────────────────┐
│ Category Filter                   ☑ │ ← Enable toggle
├──────────────────────────────────────┤
│ Include Categories:                  │
│ ☑ Main Game (0)                      │
│ ☐ Port (1)                           │
│ ☑ DLC (2)                            │
│ ☐ Bundle (3)                         │
│ ☑ Expansion (4)                      │
│ ☐ Mod (5)                            │
│                                      │
│ Exclude Categories:                  │
│ ☑ Season (7)                         │
│ ☑ Update (14)                        │
│                                      │
│ Priority: [90▓▓▓▓▓░░░░] High        │
└──────────────────────────────────────┘
```

**Content Protection Editor:**
```
┌──────────────────────────────────────┐
│ Content Protection Filter         ☑ │
├──────────────────────────────────────┤
│ Name Patterns (Regex):               │
│ • rom.*hack              [Remove]    │
│ • fan.*game              [Remove]    │
│ • (un)?official.*mod     [Remove]    │
│ [+ Add Pattern]                      │
│                                      │
│ Developer Blacklist:                 │
│ • DMCA Corp              [Remove]    │
│ [+ Add Developer]                    │
│                                      │
│ Test Pattern: [Super Mario ROM Hack]│
│ Result: ✓ Matches "rom.*hack"       │
│                                      │
│ Priority: [100▓▓▓▓▓▓▓▓▓▓] Highest   │
└──────────────────────────────────────┘
```

**Quality Filter Editor:**
```
┌──────────────────────────────────────┐
│ Quality Filter                    ☑ │
├──────────────────────────────────────┤
│ Minimum Rating:                      │
│ [0.0      ▓░░░░░░░░░      10.0]     │
│                                      │
│ Minimum Rating Count:                │
│ [0        ▓░░░░░░░░░      1000]     │
│                                      │
│ Minimum Follows:                     │
│ [0        ▓▓░░░░░░░░      10000]    │
│ Currently: 100                       │
│                                      │
│ Priority: [80▓▓▓▓▓▓▓░░░] High       │
└──────────────────────────────────────┘
```

**Custom Filter Editor (Advanced):**
```
┌──────────────────────────────────────┐
│ Custom Filter                     ☐ │
├──────────────────────────────────────┤
│ JavaScript Function:                 │
│ ┌──────────────────────────────────┐ │
│ │ // Return true to KEEP game      │ │
│ │ // Return false to FILTER OUT    │ │
│ │ return game.name.includes('Zelda')│ │
│ │   && game.release_date > 2000000;│ │
│ │                                  │ │
│ │                                  │ │
│ └──────────────────────────────────┘ │
│ [Test Function]                      │
│                                      │
│ ⚠️ Advanced users only               │
│ Priority: [50▓▓▓▓▓░░░░░] Medium     │
└──────────────────────────────────────┘
```

---

## Phase 5: Site-Wide Application System (Week 3)

### 5.1 - Filter Application Strategy

**Option A: Service-Level Integration (Recommended)**

Create a central `FilterService` that all game-fetching services use:

```typescript
// src/services/filterService.ts

export class FilterService {
  private static instance: FilterService;
  private activeConfig: FilterConfig;
  private engine: FilterEngine;

  private constructor() {
    this.activeConfig = this.loadActiveConfig();
    this.engine = new FilterEngine(this.activeConfig);
  }

  static getInstance(): FilterService {
    if (!FilterService.instance) {
      FilterService.instance = new FilterService();
    }
    return FilterService.instance;
  }

  /**
   * Apply active filters to game array
   */
  applyFilters(games: Game[]): Game[] {
    const results = this.engine.applyFilters(games);
    return results.filter(r => r.passed).map(r => r.game);
  }

  /**
   * Apply filters and get detailed results
   */
  applyFiltersDetailed(games: Game[]): FilterResult[] {
    return this.engine.applyFilters(games);
  }

  /**
   * Update active config (from Filter Creator)
   */
  setActiveConfig(config: FilterConfig) {
    this.activeConfig = config;
    this.engine = new FilterEngine(config);
    this.saveActiveConfig(config);

    // Notify all services to refresh
    window.dispatchEvent(new CustomEvent('filterConfigChanged'));
  }

  private loadActiveConfig(): FilterConfig {
    const saved = localStorage.getItem('activeFilterConfig');
    return saved ? JSON.parse(saved) : DEFAULT_FILTER_CONFIG;
  }

  private saveActiveConfig(config: FilterConfig) {
    localStorage.setItem('activeFilterConfig', JSON.stringify(config));
  }
}

export const filterService = FilterService.getInstance();
```

**Integration Points:**
```typescript
// In igdbServiceV2.ts
import { filterService } from './filterService';

class IGDBServiceV2 {
  async searchGames(query: string): Promise<IGDBGame[]> {
    // ... existing search logic ...

    // REPLACE existing filtering with centralized service
    const rawGames = await this.performOptimizedSearch(query, limit);

    // Apply centralized filters
    const filtered = filterService.applyFilters(rawGames);

    return filtered;
  }
}
```

**Services to Update:**
- ✅ `igdbServiceV2.ts` - Main search
- ✅ `enhancedIGDBService.ts` - Multi-query search
- ✅ `exploreService.ts` - Explore page
- ✅ `gameSearchService.ts` - Search results
- ✅ Any other services that filter games

---

### 5.2 - Apply Site-Wide Workflow

```
Filter Creator Page
      ↓
User clicks "Apply Site-Wide"
      ↓
┌─────────────────────────────────┐
│ Confirmation Modal              │
│                                 │
│ ⚠️ WARNING                      │
│ This will replace all filtering │
│ logic site-wide immediately.    │
│                                 │
│ Config: "My Custom Filter"      │
│ - 5 filter rules enabled        │
│ - 2 sort rules enabled          │
│                                 │
│ Test Results (500 sample):      │
│ - Passed: 347 (69%)             │
│ - Filtered: 153 (31%)           │
│                                 │
│ [Export Backup Config First]    │
│                                 │
│ [Cancel]  [Apply Site-Wide]     │
└─────────────────────────────────┘
      ↓ (if Apply)
filterService.setActiveConfig(config)
      ↓
All services automatically use new config
      ↓
Toast: "Filter config applied site-wide"
```

---

## Phase 6: Advanced Features (Week 3-4)

### 6.1 - Config Library

Allow saving/loading multiple configs:

```
My Filter Configs:
├─ Production Default ⭐ (active)
├─ Aggressive Mod Filtering
├─ Quality-Only (No Content Filter)
├─ Permissive (For Research)
└─ [+ Create New Config]
```

### 6.2 - A/B Testing Integration

```typescript
// Compare two configs side-by-side
interface ABTestResult {
  configA: FilterConfig;
  configB: FilterConfig;
  sample: Game[];
  results: {
    configA: FilterResult[];
    configB: FilterResult[];
  };
  diff: {
    onlyInA: Game[];
    onlyInB: Game[];
    both: Game[];
  };
}
```

### 6.3 - Filter Analytics

Track filter performance over time:

```
Filter Analytics:
┌─────────────────────────────────────┐
│ Content Protection Filter           │
│ - Activated: 2,345 times (last 7d)  │
│ - Top patterns:                     │
│   • "rom.*hack": 1,234 (52%)        │
│   • "fan.*game": 678 (29%)          │
│   • "mod": 433 (19%)                │
│                                     │
│ Category Filter                     │
│ - Activated: 567 times              │
│ - Most filtered: Season (7): 345    │
└─────────────────────────────────────┘
```

### 6.4 - Export/Import Formats

**JSON Export:**
```json
{
  "version": "1.0.0",
  "name": "My Custom Filter",
  "description": "Aggressive mod filtering with quality focus",
  "filters": [...],
  "sorting": [...],
  "metadata": {...}
}
```

**URL Sharing:**
```
https://vgreviewapp.com/filter-creator?config=eyJ2ZXJzaW9uIjoiMS4wLjAi...
```

---

## Implementation Roadmap

### Week 1: Foundation
- [x] Design architecture
- [ ] Implement `FilterConfig` types
- [ ] Implement `FilterEngine` class
- [ ] Implement `SampleGenerator` class
- [ ] Create basic UI layout
- [ ] Unit tests for filter engine

### Week 2: UI & Editor
- [ ] Build FilterCreatorPage shell
- [ ] Implement ResultsGrid with mini cards
- [ ] Build filter rule editors (Category, Content, Quality)
- [ ] Add real-time filter application
- [ ] Add stats panel
- [ ] Add export/import buttons

### Week 3: Integration
- [ ] Create `FilterService` singleton
- [ ] Integrate with `igdbServiceV2`
- [ ] Integrate with `exploreService`
- [ ] Integrate with `gameSearchService`
- [ ] Build "Apply Site-Wide" system
- [ ] Add confirmation modals

### Week 4: Polish & Advanced
- [ ] Add config library
- [ ] Add A/B testing view
- [ ] Add filter analytics
- [ ] Add URL sharing
- [ ] Performance optimization (virtualized grid)
- [ ] Documentation
- [ ] User testing

---

## Technical Considerations

### Performance
- **500 games @ 60fps:** Need efficient rendering
  - Use `react-window` for virtualized scrolling
  - Memoize filter results
  - Debounce filter updates (300ms)

### Data Persistence
- **localStorage:** Active config, saved configs
- **SessionStorage:** Current sample (regenerate on page reload)
- **IndexedDB (optional):** Filter analytics, A/B test results

### Safety Features
- **Backup before apply:** Auto-export current config before applying new one
- **Rollback button:** Quick revert to previous config
- **Dry run required:** Can't apply site-wide without testing on sample first
- **Config validation:** Check for destructive filters (e.g., "filters ALL games")

---

## File Structure

```
src/
├── pages/
│   └── FilterCreatorPage.tsx          (Main page)
│
├── components/
│   └── filter-creator/
│       ├── FilterControlPanel.tsx
│       ├── FilterRuleEditor.tsx
│       ├── SortRuleEditor.tsx
│       ├── ResultsGrid.tsx
│       ├── MiniGameCard.tsx
│       ├── StatsPanel.tsx
│       └── ConfigManager.tsx
│
├── services/
│   └── filterService.ts               (Singleton, site-wide)
│
├── utils/
│   ├── filterConfig.ts                (Types & defaults)
│   ├── filterEngine.ts                (Filter application logic)
│   └── sampleGenerator.ts             (500-game sample)
│
└── test/
    ├── filterEngine.test.ts
    ├── sampleGenerator.test.ts
    └── filterService.test.ts
```

---

## Open Questions

1. **Should filters be version-controlled?**
   - Could commit `filterConfigs/*.json` to git for team collaboration

2. **Should we show filter justifications in production?**
   - "This game was filtered because: [reason]" on hover?
   - Privacy consideration: Users shouldn't see "filtered by content protection"

3. **How to handle breaking changes in FilterConfig schema?**
   - Add migration system for old configs?
   - Versioning strategy?

4. **Should filter configs be user-specific or global?**
   - Admin-only feature? Or let users customize their own filters?

---

## Success Metrics

### Diagnostic Tool
- ✅ Can test 500 games in < 2 seconds
- ✅ Visual feedback is clear (green/red boxes)
- ✅ Can export/import configs easily
- ✅ Filter changes update results in real-time

### Site-Wide Integration
- ✅ No performance regression on search/explore pages
- ✅ All existing filters can be represented in new system
- ✅ Easy rollback if something breaks
- ✅ Filter stats help tune settings over time

---

This plan provides a complete roadmap for building the Filter Creator diagnostic tool. The key innovation is the **centralized `FilterService`** that acts as a single source of truth for all game filtering across the app.

**Next Steps:**
1. Review and approve architecture
2. Start with Phase 1 (FilterConfig + FilterEngine)
3. Build sample generator
4. Iterate on UI based on real data

Let me know if you'd like me to start implementing any specific phase!
