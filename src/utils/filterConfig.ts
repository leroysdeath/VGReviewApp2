/**
 * Centralized filter configuration system
 * Supports export/import as JSON for testing and sharing
 */

export interface FilterRule {
  id: string;
  name: string;
  type: 'category' | 'content' | 'quality' | 'release' | 'platform' | 'custom';
  enabled: boolean;
  priority: number; // Higher = applied first (100 = highest)
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
  minTotalRating?: number;

  // Release status
  releaseStatuses?: ('released' | 'unreleased' | 'canceled' | 'early_access')[];

  // Platform quality
  minPlatformQuality?: number;

  // Custom function (for advanced filtering)
  // Stored as string, evaluated safely in sandboxed context
  customFunction?: string;
}

export interface SortRule {
  id: string;
  name: string;
  enabled: boolean;
  field: 'priority' | 'rating' | 'follows' | 'release_date' | 'name' | 'total_rating';
  order: 'asc' | 'desc';
  weight?: number; // For multi-factor sorting (default: 1.0)
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

/**
 * Default filter config (current production settings)
 */
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
          '(un)?official.*mod',
          'homebrew',
          'pirate',
          'bootleg'
        ],
        developerBlacklist: [],
        publisherBlacklist: []
      }
    },
    {
      id: 'category-filter',
      name: 'Category Filter (Seasons, Updates)',
      type: 'category',
      enabled: true,
      priority: 90,
      condition: {
        categoryIncludes: [0, 2, 4, 8, 9, 10, 11], // Main, DLC, Expansion, Remake, Remaster, etc.
        categoryExcludes: [7, 14] // Season, Update
      }
    },
    {
      id: 'quality-filter',
      name: 'Quality Filter (Low engagement)',
      type: 'quality',
      enabled: false, // Disabled by default in production
      priority: 80,
      condition: {
        minRating: 0,
        minRatingCount: 0,
        minFollows: 0,
        minTotalRating: 0
      }
    }
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

/**
 * Permissive config for testing/research (minimal filtering)
 */
export const PERMISSIVE_FILTER_CONFIG: FilterConfig = {
  version: '1.0.0',
  name: 'Permissive (Research Mode)',
  description: 'Minimal filtering for research and testing',
  filters: [
    {
      id: 'category-filter-minimal',
      name: 'Category Filter (Updates only)',
      type: 'category',
      enabled: true,
      priority: 90,
      condition: {
        categoryExcludes: [14] // Only exclude Updates
      }
    }
  ],
  sorting: [
    {
      id: 'name-sort',
      name: 'Alphabetical',
      enabled: true,
      field: 'name',
      order: 'asc',
      weight: 1.0
    }
  ],
  metadata: {
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    appliedSiteWide: false
  }
};

/**
 * Aggressive config for heavy mod/fan content filtering
 */
export const AGGRESSIVE_FILTER_CONFIG: FilterConfig = {
  version: '1.0.0',
  name: 'Aggressive Mod Filtering',
  description: 'Maximum content protection with quality requirements',
  filters: [
    {
      id: 'content-protection-aggressive',
      name: 'Aggressive Content Protection',
      type: 'content',
      enabled: true,
      priority: 100,
      condition: {
        namePatterns: [
          'rom.*hack',
          'fan.*game',
          'mod',
          'homebrew',
          'pirate',
          'bootleg',
          'unofficial',
          'beta',
          'demo',
          'prototype',
          'remake.*fan',
          'hd.*texture',
          'retranslation',
          'patch'
        ]
      }
    },
    {
      id: 'category-filter-aggressive',
      name: 'Category Filter (Strict)',
      type: 'category',
      enabled: true,
      priority: 90,
      condition: {
        categoryIncludes: [0, 8, 9, 10], // Main games, Remakes, Remasters only
        categoryExcludes: [2, 3, 4, 5, 7, 13, 14] // Exclude DLC, Bundles, Mods, etc.
      }
    },
    {
      id: 'quality-filter-aggressive',
      name: 'Quality Filter (High standards)',
      type: 'quality',
      enabled: true,
      priority: 80,
      condition: {
        minFollows: 100,
        minTotalRating: 50
      }
    }
  ],
  sorting: [
    {
      id: 'rating-sort',
      name: 'Rating Descending',
      enabled: true,
      field: 'rating',
      order: 'desc',
      weight: 1.0
    }
  ],
  metadata: {
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    appliedSiteWide: false
  }
};

/**
 * Validate filter config structure
 */
export function validateFilterConfig(config: FilterConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.version || typeof config.version !== 'string') {
    errors.push('Missing or invalid version');
  }

  if (!config.name || typeof config.name !== 'string') {
    errors.push('Missing or invalid name');
  }

  if (!Array.isArray(config.filters)) {
    errors.push('Filters must be an array');
  }

  if (!Array.isArray(config.sorting)) {
    errors.push('Sorting must be an array');
  }

  // Validate each filter rule
  config.filters?.forEach((filter, index) => {
    if (!filter.id) {
      errors.push(`Filter ${index}: Missing id`);
    }
    if (typeof filter.enabled !== 'boolean') {
      errors.push(`Filter ${filter.id}: enabled must be boolean`);
    }
    if (typeof filter.priority !== 'number' || filter.priority < 0 || filter.priority > 100) {
      errors.push(`Filter ${filter.id}: priority must be 0-100`);
    }
  });

  // Validate each sort rule
  config.sorting?.forEach((sort, index) => {
    if (!sort.id) {
      errors.push(`Sort ${index}: Missing id`);
    }
    if (!['priority', 'rating', 'follows', 'release_date', 'name', 'total_rating'].includes(sort.field)) {
      errors.push(`Sort ${sort.id}: invalid field ${sort.field}`);
    }
    if (!['asc', 'desc'].includes(sort.order)) {
      errors.push(`Sort ${sort.id}: order must be asc or desc`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Clone filter config (deep copy)
 */
export function cloneFilterConfig(config: FilterConfig): FilterConfig {
  return JSON.parse(JSON.stringify(config));
}

/**
 * Merge two filter configs (second takes precedence)
 */
export function mergeFilterConfigs(base: FilterConfig, override: Partial<FilterConfig>): FilterConfig {
  return {
    ...base,
    ...override,
    filters: override.filters || base.filters,
    sorting: override.sorting || base.sorting,
    metadata: {
      ...base.metadata,
      ...override.metadata,
      modifiedAt: new Date().toISOString()
    }
  };
}

/**
 * Export config to JSON string
 */
export function exportFilterConfig(config: FilterConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Import config from JSON string
 */
export function importFilterConfig(json: string): { config: FilterConfig | null; error: string | null } {
  try {
    const config = JSON.parse(json) as FilterConfig;
    const validation = validateFilterConfig(config);

    if (!validation.valid) {
      return {
        config: null,
        error: `Invalid config: ${validation.errors.join(', ')}`
      };
    }

    return { config, error: null };
  } catch (err) {
    return {
      config: null,
      error: `Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`
    };
  }
}
