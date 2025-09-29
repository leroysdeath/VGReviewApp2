/**
 * RevenueCat Service
 * Wrapper service for RevenueCat SDK integration
 * Phase 2 - Pre-integration setup (SDK not yet installed)
 */

import { getRevenueCatConfig, REVENUECAT_FEATURES, SUBSCRIPTION_BENEFITS, SUBSCRIPTION_PRICING } from '../config/revenuecat.config';
import { supabase } from './supabase';

/**
 * RevenueCat customer info interface
 * Based on RevenueCat SDK types
 */
export interface CustomerInfo {
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  entitlements: {
    active: {
      [key: string]: {
        identifier: string;
        isActive: boolean;
        willRenew: boolean;
        periodType: string;
        latestPurchaseDate: string;
        originalPurchaseDate: string;
        expirationDate?: string;
        productIdentifier: string;
      };
    };
  };
  firstSeen: string;
  originalAppUserId: string;
  managementURL?: string;
}

/**
 * Product interface
 */
export interface Product {
  identifier: string;
  priceString: string;
  price: number;
  currencyCode: string;
  title: string;
  description: string;
  subscriptionPeriod?: {
    unit: 'day' | 'week' | 'month' | 'year';
    value: number;
  };
}

/**
 * Purchase result interface
 */
export interface PurchaseResult {
  customerInfo: CustomerInfo;
  productIdentifier: string;
  transaction: {
    transactionIdentifier: string;
    purchaseDate: string;
  };
}

class RevenueCatService {
  private initialized = false;
  private config = getRevenueCatConfig();
  private mockMode = !REVENUECAT_FEATURES.enabled;

  /**
   * Initialize RevenueCat SDK
   * This will be called when the SDK is actually integrated
   */
  async initialize(userId?: string): Promise<void> {
    if (this.initialized) {
      console.warn('RevenueCat already initialized');
      return;
    }

    if (this.mockMode) {
      console.log('🎭 RevenueCat in mock mode (SDK not integrated yet)');
      this.initialized = true;
      return;
    }

    try {
      // When SDK is integrated:
      // const { Purchases } = await import('@revenuecat/purchases-js');
      //
      // Purchases.configure({
      //   apiKey: this.config.apiKey,
      //   appUserID: userId || undefined,
      // });

      console.log('✅ RevenueCat initialized');
      this.initialized = true;

      // Sync user attributes if logged in
      if (userId) {
        await this.syncUserAttributes(userId);
      }
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      throw error;
    }
  }

  /**
   * Get customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.mockMode) {
      // Return mock data for development
      return this.getMockCustomerInfo();
    }

    try {
      // When SDK is integrated:
      // const { Purchases } = await import('@revenuecat/purchases-js');
      // const customerInfo = await Purchases.getCustomerInfo();
      // return customerInfo;

      return null;
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return null;
    }
  }

  /**
   * Get available products
   */
  async getProducts(): Promise<Product[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.mockMode) {
      // Return mock products for development
      return this.getMockProducts();
    }

    try {
      // When SDK is integrated:
      // const { Purchases } = await import('@revenuecat/purchases-js');
      // const products = await Purchases.getProducts(
      //   Object.values(this.config.products)
      // );
      // return products;

      return [];
    } catch (error) {
      console.error('Failed to get products:', error);
      return [];
    }
  }

  /**
   * Purchase a product
   */
  async purchaseProduct(productIdentifier: string): Promise<PurchaseResult | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!REVENUECAT_FEATURES.allowPurchases) {
      console.warn('Purchases are currently disabled');
      return null;
    }

    if (this.mockMode) {
      console.log('🎭 Mock purchase:', productIdentifier);
      return this.getMockPurchaseResult(productIdentifier);
    }

    try {
      // When SDK is integrated:
      // const { Purchases } = await import('@revenuecat/purchases-js');
      // const result = await Purchases.purchaseProduct(productIdentifier);
      //
      // // Store purchase info in Supabase
      // await this.storePurchaseInfo(result);
      //
      // return result;

      return null;
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<CustomerInfo | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.mockMode) {
      console.log('🎭 Mock restore purchases');
      return this.getMockCustomerInfo();
    }

    try {
      // When SDK is integrated:
      // const { Purchases } = await import('@revenuecat/purchases-js');
      // const customerInfo = await Purchases.restorePurchases();
      // return customerInfo;

      return null;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return null;
    }
  }

  /**
   * Check if user has pro access
   */
  async hasProAccess(): Promise<boolean> {
    const customerInfo = await this.getCustomerInfo();
    if (!customerInfo) return false;

    const proEntitlement = customerInfo.entitlements.active[this.config.entitlements.pro];
    return proEntitlement?.isActive || false;
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(): Promise<{
    isActive: boolean;
    tier: 'free' | 'pro' | 'premium';
    expirationDate?: string;
    willRenew?: boolean;
  }> {
    const customerInfo = await this.getCustomerInfo();

    if (!customerInfo) {
      return { isActive: false, tier: 'free' };
    }

    const proEntitlement = customerInfo.entitlements.active[this.config.entitlements.pro];
    const premiumEntitlement = this.config.entitlements.premium
      ? customerInfo.entitlements.active[this.config.entitlements.premium]
      : null;

    if (premiumEntitlement?.isActive) {
      return {
        isActive: true,
        tier: 'premium',
        expirationDate: premiumEntitlement.expirationDate,
        willRenew: premiumEntitlement.willRenew
      };
    }

    if (proEntitlement?.isActive) {
      return {
        isActive: true,
        tier: 'pro',
        expirationDate: proEntitlement.expirationDate,
        willRenew: proEntitlement.willRenew
      };
    }

    return { isActive: false, tier: 'free' };
  }

  /**
   * Sync user attributes with RevenueCat
   */
  private async syncUserAttributes(userId: string): Promise<void> {
    try {
      // Get user profile from Supabase
      const { data: profile } = await supabase
        .from('user')
        .select('username, created_at')
        .eq('id', userId)
        .single();

      if (!profile) return;

      // When SDK is integrated:
      // const { Purchases } = await import('@revenuecat/purchases-js');
      //
      // // Set user attributes
      // await Purchases.setAttributes({
      //   username: profile.username,
      //   created_at: profile.created_at,
      //   platform: 'web'
      // });

      console.log('User attributes synced with RevenueCat');
    } catch (error) {
      console.error('Failed to sync user attributes:', error);
    }
  }

  /**
   * Store purchase info in Supabase
   */
  private async storePurchaseInfo(result: PurchaseResult): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Store in a purchases table (would need to be created)
      // await supabase.from('user_purchases').insert({
      //   user_id: user.id,
      //   product_id: result.productIdentifier,
      //   transaction_id: result.transaction.transactionIdentifier,
      //   purchase_date: result.transaction.purchaseDate,
      //   platform: 'web',
      //   status: 'active'
      // });
    } catch (error) {
      console.error('Failed to store purchase info:', error);
    }
  }

  /**
   * Mock data for development
   */
  private getMockCustomerInfo(): CustomerInfo {
    return {
      activeSubscriptions: REVENUECAT_FEATURES.useTestMode ? ['vgr_pro_monthly'] : [],
      allPurchasedProductIdentifiers: REVENUECAT_FEATURES.useTestMode ? ['vgr_pro_monthly'] : [],
      entitlements: {
        active: REVENUECAT_FEATURES.useTestMode ? {
          [this.config.entitlements.pro]: {
            identifier: this.config.entitlements.pro,
            isActive: true,
            willRenew: true,
            periodType: 'normal',
            latestPurchaseDate: new Date().toISOString(),
            originalPurchaseDate: new Date().toISOString(),
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            productIdentifier: 'vgr_pro_monthly'
          }
        } : {}
      },
      firstSeen: new Date().toISOString(),
      originalAppUserId: 'mock_user_123',
      managementURL: 'https://app.revenuecat.com/manage'
    };
  }

  private getMockProducts(): Product[] {
    return [
      {
        identifier: this.config.products.monthly,
        priceString: `$${SUBSCRIPTION_PRICING.monthly.price}`,
        price: SUBSCRIPTION_PRICING.monthly.price,
        currencyCode: SUBSCRIPTION_PRICING.monthly.currency,
        title: 'VGReview Pro Monthly',
        description: 'Get Pro access for a month',
        subscriptionPeriod: {
          unit: 'month',
          value: 1
        }
      },
      {
        identifier: this.config.products.yearly,
        priceString: `$${SUBSCRIPTION_PRICING.yearly.price}`,
        price: SUBSCRIPTION_PRICING.yearly.price,
        currencyCode: SUBSCRIPTION_PRICING.yearly.currency,
        title: 'VGReview Pro Yearly',
        description: `Get Pro access for a year (Save ${SUBSCRIPTION_PRICING.yearly.savings}%)`,
        subscriptionPeriod: {
          unit: 'year',
          value: 1
        }
      },
      ...(this.config.products.lifetime ? [{
        identifier: this.config.products.lifetime,
        priceString: `$${SUBSCRIPTION_PRICING.lifetime.price}`,
        price: SUBSCRIPTION_PRICING.lifetime.price,
        currencyCode: SUBSCRIPTION_PRICING.lifetime.currency,
        title: 'VGReview Pro Lifetime',
        description: 'Get Pro access forever'
      }] : [])
    ];
  }

  private getMockPurchaseResult(productIdentifier: string): PurchaseResult {
    return {
      customerInfo: this.getMockCustomerInfo(),
      productIdentifier,
      transaction: {
        transactionIdentifier: 'mock_transaction_' + Date.now(),
        purchaseDate: new Date().toISOString()
      }
    };
  }

  /**
   * Get subscription benefits for display
   */
  getSubscriptionBenefits(tier: 'free' | 'pro' | 'premium' = 'free') {
    return SUBSCRIPTION_BENEFITS[tier] || SUBSCRIPTION_BENEFITS.free;
  }

  /**
   * Get pricing information
   */
  getPricing() {
    return SUBSCRIPTION_PRICING;
  }

  /**
   * Check if RevenueCat is enabled
   */
  isEnabled(): boolean {
    return REVENUECAT_FEATURES.enabled && !this.mockMode;
  }

  /**
   * Check if pricing should be shown
   */
  shouldShowPricing(): boolean {
    return REVENUECAT_FEATURES.showPricing;
  }
}

// Export singleton instance
export const revenueCatService = new RevenueCatService();