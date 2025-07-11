// Push notification service
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

class PushNotificationService {
  private readonly vapidPublicKey: string | null = null;
  private readonly pushEndpoint: string;
  private readonly subscriptions: Map<string, PushSubscription> = new Map();

  constructor() {
    this.pushEndpoint = `${SUPABASE_URL}/functions/v1/push-notifications`;
  }

  // Check if push notifications are supported
  public isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Request permission for push notifications
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isPushSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }

    return await Notification.requestPermission();
  }

  // Get VAPID public key
  private async getVapidPublicKey(): Promise<string> {
    if (this.vapidPublicKey) {
      return this.vapidPublicKey;
    }

    try {
      const response = await fetch(`${this.pushEndpoint}/generate-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get VAPID public key');
      }

      const data = await response.json();
      return data.publicKey;
    } catch (error) {
      console.error('Error getting VAPID public key:', error);
      throw error;
    }
  }

  // Register service worker
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    try {
      return await navigator.serviceWorker.register('/service-worker.js');
    } catch (error) {
      console.error('Error registering service worker:', error);
      throw error;
    }
  }

  // Subscribe to push notifications
  public async subscribe(userId: string): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) {
      console.warn('Push notifications are not supported');
      return null;
    }

    try {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Permission for push notifications was not granted');
        return null;
      }

      const registration = await this.registerServiceWorker();
      const vapidPublicKey = await this.getVapidPublicKey();
      
      // Convert VAPID key to Uint8Array
      const convertedVapidKey = this.urlBase64ToUint8Array(vapidPublicKey);
      
      // Get push subscription
      let subscription = await registration.pushManager.getSubscription();
      
      // If no subscription exists, create one
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }
      
      // Save subscription to server
      await this.saveSubscription(subscription, userId);
      
      // Store subscription locally
      this.subscriptions.set(userId, subscription);
      
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  public async unsubscribe(): Promise<boolean> {
    if (!this.isPushSupported()) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        return await subscription.unsubscribe();
      }
      
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  // Save subscription to server
  private async saveSubscription(subscription: PushSubscription, userId: string): Promise<void> {
    try {
      const response = await fetch(`${this.pushEndpoint}/save-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  }

  // Send push notification
  public async sendNotification(
    subscription: PushSubscription,
    title: string,
    body: string,
    options: {
      icon?: string;
      badge?: string;
      image?: string;
      data?: any;
      actions?: Array<{
        action: string;
        title: string;
        icon?: string;
      }>;
    } = {}
  ): Promise<boolean> {
    try {
      const payload = {
        title,
        body,
        ...options,
        timestamp: Date.now()
      };

      const response = await fetch(`${this.pushEndpoint}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription,
          payload
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  // Send notification to user
  public async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    options: {
      icon?: string;
      badge?: string;
      image?: string;
      data?: any;
      actions?: Array<{
        action: string;
        title: string;
        icon?: string;
      }>;
    } = {}
  ): Promise<boolean> {
    try {
      const notification = {
        title,
        body,
        ...options,
        timestamp: Date.now()
      };

      const response = await fetch(`${this.pushEndpoint}/send-to-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          notification
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send notification to user');
      }

      return true;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  // Helper function to convert base64 to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
}

export const pushNotificationService = new PushNotificationService();