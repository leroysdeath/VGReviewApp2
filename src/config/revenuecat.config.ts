/**
 * RevenueCat Configuration
 * Centralized configuration for RevenueCat SDK integration
 * Phase 2 - Pre-integration setup
 */

export interface RevenueCatConfig {
  /**
   * RevenueCat Public API Key
   * Get this from RevenueCat Dashboard > Project Settings > API Keys
   */
  apiKey: string;

  /**
   * Enable debug logging
   * Should be false in production
   */
  debug: boolean;

  /**
   * User ID prefix for anonymous users
   */
  anonymousIdPrefix: string;

  /**
   * Product identifiers for different subscription tiers
   */
  products: {
    monthly: string;
    yearly: string;
    lifetime?: string;
  };

  /**
   * Entitlement identifiers
   * These represent what the user gets access to
   */
  entitlements: {
    pro: string;
    premium?: string;
  };

  /**
   * Enable automatic collection of Apple Search Ads attribution (iOS)
   */
  collectAppleSearchAdsAttribution?: boolean;

  /**
   * Custom user attributes to sync
   */
  customAttributes?: {
    [key: string]: string;
  };
}

/**
 * Development configuration (sandbox mode)
 */
const developmentConfig: RevenueCatConfig = {
  apiKey: import.meta.env.VITE_REVENUECAT_PUBLIC_KEY_DEV || 'rc_dev_placeholder',
  debug: true,
  anonymousIdPrefix: 'vgr_dev_',
  products: {
    monthly: 'vgr_pro_monthly_sandbox',
    yearly: 'vgr_pro_yearly_sandbox',
    lifetime: 'vgr_pro_lifetime_sandbox'
  },
  entitlements: {
    pro: 'vgr_pro_features',
    premium: 'vgr_premium_features'
  }
};

/**
 * Production configuration
 */
const productionConfig: RevenueCatConfig = {
  apiKey: import.meta.env.VITE_REVENUECAT_PUBLIC_KEY || '',
  debug: false,
  anonymousIdPrefix: 'vgr_',
  products: {
    monthly: 'vgr_pro_monthly',
    yearly: 'vgr_pro_yearly',
    lifetime: 'vgr_pro_lifetime'
  },
  entitlements: {
    pro: 'vgr_pro_features'
  }
};

/**
 * Get the appropriate configuration based on environment
 */
export function getRevenueCatConfig(): RevenueCatConfig {
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  return isDevelopment ? developmentConfig : productionConfig;
}

/**
 * RevenueCat webhook endpoints for server-side events
 * These would be implemented as Netlify Functions
 */
export const REVENUECAT_WEBHOOKS = {
  purchase: '/.netlify/functions/revenuecat-purchase',
  renewal: '/.netlify/functions/revenuecat-renewal',
  cancellation: '/.netlify/functions/revenuecat-cancellation',
  billing: '/.netlify/functions/revenuecat-billing'
};

/**
 * CSP requirements for RevenueCat
 * These domains must be allowed in Content Security Policy
 */
export const REVENUECAT_CSP_DOMAINS = {
  script: [
    'https://api.revenuecat.com',
    'https://sdk.revenuecat.com',
    'https://app.revenuecat.com'
  ],
  connect: [
    'https://api.revenuecat.com',
    'https://purchases.revenuecat.com',
    'https://api.segment.io' // Optional: for analytics
  ],
  frame: [
    'https://checkout.revenuecat.com' // For hosted checkout
  ]
};

/**
 * Feature flags for gradual rollout
 */
export const REVENUECAT_FEATURES = {
  enabled: import.meta.env.VITE_REVENUECAT_ENABLED === 'true',
  showPricing: import.meta.env.VITE_SHOW_PRICING === 'true',
  allowPurchases: import.meta.env.VITE_ALLOW_PURCHASES === 'true',
  useTestMode: import.meta.env.VITE_REVENUECAT_TEST_MODE === 'true'
};

/**
 * Subscription benefits for different tiers
 */
export const SUBSCRIPTION_BENEFITS = {
  free: [
    'Access to 185,000+ games database',
    'Write unlimited reviews',
    'Create your gaming profile',
    'Follow other gamers',
    'Basic search and discovery'
  ],
  pro: [
    'All free features',
    'Advanced search filters',
    'Priority support',
    'No advertisements',
    'Custom profile themes',
    'Detailed analytics dashboard',
    'Export your data anytime',
    'Early access to new features'
  ],
  premium: [
    'All pro features',
    'API access',
    'Bulk operations',
    'Team collaboration',
    'White-label options'
  ]
};

/**
 * Pricing configuration (to be updated with actual prices)
 */
export const SUBSCRIPTION_PRICING = {
  monthly: {
    price: 4.99,
    currency: 'USD',
    period: 'month'
  },
  yearly: {
    price: 39.99,
    currency: 'USD',
    period: 'year',
    savings: 20 // percentage
  },
  lifetime: {
    price: 99.99,
    currency: 'USD',
    period: 'lifetime'
  }
};