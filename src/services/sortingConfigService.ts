/**
 * Sorting Configuration Service
 *
 * Manages sorting algorithm configurations with save/load/apply functionality
 * Supports multiple saved configurations and safe fallback to default sorting
 */

import { supabase } from '../supabaseClient';

export interface SortingWeights {
  nameMatch: number;      // 0-100
  rating: number;         // 0-100
  likes: number;          // 0-100 (follows)
  buzz: number;           // 0-100 (hypes)
  franchiseImportance: number; // 0-100
}

export interface SortingConfig {
  id?: string;
  name: string;
  description: string;
  weights: SortingWeights;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
  metadata?: {
    createdBy?: string;
    testResults?: {
      avgRelevance?: number;
      userFeedback?: number;
      performanceMs?: number;
    };
  };
}

// Default sorting configuration (current behavior)
export const DEFAULT_SORTING_CONFIG: SortingConfig = {
  name: 'Default (Current)',
  description: 'Current production sorting algorithm',
  weights: {
    nameMatch: 30,
    rating: 25,
    likes: 20,
    buzz: 15,
    franchiseImportance: 10
  },
  isActive: true,
  isDefault: true
};

// Rating-focused configuration (matches reference image style)
export const RATING_FOCUSED_CONFIG: SortingConfig = {
  name: 'Rating-Focused',
  description: 'Prioritizes IGDB aggregated rating heavily (70%), with name match as tiebreaker',
  weights: {
    nameMatch: 15,
    rating: 70,
    likes: 8,
    buzz: 5,
    franchiseImportance: 2
  },
  isActive: false,
  isDefault: false
};

// Local storage key
const STORAGE_KEY = 'vgr_sorting_configs';
const ACTIVE_CONFIG_KEY = 'vgr_active_sorting_config';

class SortingConfigService {
  private configs: Map<string, SortingConfig> = new Map();
  private activeConfigId: string | null = null;

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Get all saved configurations
   */
  getAllConfigs(): SortingConfig[] {
    return Array.from(this.configs.values()).sort((a, b) => {
      // Default first, then active, then by creation date
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      if (a.isActive && !b.isActive) return -1;
      if (b.isActive && !a.isActive) return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }

  /**
   * Get active configuration (or default if none active)
   */
  getActiveConfig(): SortingConfig {
    if (this.activeConfigId) {
      const config = this.configs.get(this.activeConfigId);
      if (config) return config;
    }

    // Fallback to default
    return DEFAULT_SORTING_CONFIG;
  }

  /**
   * Get configuration by ID
   */
  getConfigById(id: string): SortingConfig | null {
    return this.configs.get(id) || null;
  }

  /**
   * Save a new configuration
   */
  saveConfig(config: Omit<SortingConfig, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateId();
    const now = new Date().toISOString();

    const newConfig: SortingConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
      isActive: false, // Don't auto-activate
      isDefault: false // Can't create new defaults
    };

    this.configs.set(id, newConfig);
    this.saveToLocalStorage();

    return id;
  }

  /**
   * Update existing configuration
   */
  updateConfig(id: string, updates: Partial<SortingConfig>): boolean {
    const existing = this.configs.get(id);
    if (!existing) return false;

    // Prevent updating default config
    if (existing.isDefault) {
      console.warn('Cannot modify default configuration');
      return false;
    }

    const updated: SortingConfig = {
      ...existing,
      ...updates,
      id, // Preserve ID
      isDefault: existing.isDefault, // Preserve default status
      updatedAt: new Date().toISOString()
    };

    this.configs.set(id, updated);
    this.saveToLocalStorage();

    return true;
  }

  /**
   * Delete configuration
   */
  deleteConfig(id: string): boolean {
    const config = this.configs.get(id);
    if (!config) return false;

    // Prevent deleting default or active config
    if (config.isDefault) {
      console.warn('Cannot delete default configuration');
      return false;
    }

    if (config.isActive) {
      console.warn('Cannot delete active configuration - deactivate first');
      return false;
    }

    this.configs.delete(id);
    this.saveToLocalStorage();

    return true;
  }

  /**
   * Apply/activate a configuration
   */
  applyConfig(id: string): boolean {
    const config = this.configs.get(id);
    if (!config) return false;

    // Deactivate all other configs
    this.configs.forEach(c => {
      if (c.id === id) {
        c.isActive = true;
      } else {
        c.isActive = false;
      }
    });

    this.activeConfigId = id;
    this.saveToLocalStorage();
    localStorage.setItem(ACTIVE_CONFIG_KEY, id);

    console.log(`✅ Applied sorting config: "${config.name}"`);
    return true;
  }

  /**
   * Deactivate current config and revert to default
   */
  revertToDefault(): void {
    // Deactivate all configs
    this.configs.forEach(c => {
      c.isActive = false;
    });

    this.activeConfigId = null;
    this.saveToLocalStorage();
    localStorage.removeItem(ACTIVE_CONFIG_KEY);

    console.log('✅ Reverted to default sorting');
  }

  /**
   * Validate weights (must sum to 100)
   */
  validateWeights(weights: SortingWeights): { valid: boolean; error?: string } {
    const sum = weights.nameMatch + weights.rating + weights.likes + weights.buzz + weights.franchiseImportance;

    if (Math.abs(sum - 100) > 0.1) {
      return {
        valid: false,
        error: `Weights must sum to 100 (current: ${sum.toFixed(1)})`
      };
    }

    // Check each weight is in valid range
    const weights_arr = Object.values(weights);
    if (weights_arr.some(w => w < 0 || w > 100)) {
      return {
        valid: false,
        error: 'Each weight must be between 0 and 100'
      };
    }

    return { valid: true };
  }

  /**
   * Duplicate a configuration
   */
  duplicateConfig(id: string, newName?: string): string | null {
    const original = this.configs.get(id);
    if (!original) return null;

    const copy: Omit<SortingConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      weights: { ...original.weights },
      isActive: false,
      isDefault: false,
      metadata: original.metadata ? { ...original.metadata } : undefined
    };

    return this.saveConfig(copy);
  }

  /**
   * Save to local storage
   */
  private saveToLocalStorage(): void {
    try {
      const data = Array.from(this.configs.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save sorting configs to localStorage:', error);
    }
  }

  /**
   * Load from local storage
   */
  private loadFromLocalStorage(): void {
    try {
      // Always include default config
      const defaultId = 'default';
      this.configs.set(defaultId, { ...DEFAULT_SORTING_CONFIG, id: defaultId });

      // Include rating-focused preset
      const ratingFocusedId = 'rating-focused-preset';
      this.configs.set(ratingFocusedId, { ...RATING_FOCUSED_CONFIG, id: ratingFocusedId });

      // Load saved configs
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const configs: SortingConfig[] = JSON.parse(saved);
        configs.forEach(config => {
          if (config.id && !config.isDefault && config.id !== ratingFocusedId) {
            this.configs.set(config.id, config);
          }
        });
      }

      // Restore active config
      const activeId = localStorage.getItem(ACTIVE_CONFIG_KEY);
      if (activeId && this.configs.has(activeId)) {
        this.activeConfigId = activeId;
        this.configs.get(activeId)!.isActive = true;
      }
    } catch (error) {
      console.error('Failed to load sorting configs from localStorage:', error);
      // Fallback to default only
      this.configs.clear();
      this.configs.set('default', { ...DEFAULT_SORTING_CONFIG, id: 'default' });
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export config as JSON (for sharing)
   */
  exportConfig(id: string): string | null {
    const config = this.configs.get(id);
    if (!config) return null;

    return JSON.stringify(config, null, 2);
  }

  /**
   * Import config from JSON
   */
  importConfig(json: string): string | null {
    try {
      const config = JSON.parse(json);

      // Validate structure
      if (!config.name || !config.weights) {
        throw new Error('Invalid config format');
      }

      // Validate weights
      const validation = this.validateWeights(config.weights);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Save as new config
      return this.saveConfig({
        name: config.name,
        description: config.description || '',
        weights: config.weights,
        isActive: false,
        isDefault: false,
        metadata: config.metadata
      });
    } catch (error) {
      console.error('Failed to import config:', error);
      return null;
    }
  }
}

// Export singleton instance
export const sortingConfigService = new SortingConfigService();
