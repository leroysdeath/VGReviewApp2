import { io, Socket } from 'socket.io-client';
import { Activity } from '../types/activity';

// Connection states
export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

// Event types
export type ActivityEvent = {
  type: 'activity';
  data: Activity;
};

export type ConnectionEvent = {
  type: 'connection';
  state: ConnectionState;
  message?: string;
};

export type RealTimeEvent = ActivityEvent | ConnectionEvent;

// Listener type
export type EventListener = (event: RealTimeEvent) => void;

class RealTimeService {
  private socket: Socket | null = null;
  private listeners: EventListener[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private connectionState: ConnectionState = 'disconnected';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingEnabled = false;
  private pollingDelay = 10000; // 10 seconds

  // Initialize the WebSocket connection
  public connect(): void {
    if (this.socket) {
      return; // Already connected or connecting
    }

    try {
      // Connect to the WebSocket server
      this.socket = io('/api/activities/stream', {
        reconnection: false, // We'll handle reconnection ourselves
        transports: ['websocket'],
        timeout: 10000
      });

      // Set up event listeners
      this.socket.on('connect', this.handleConnect);
      this.socket.on('disconnect', this.handleDisconnect);
      this.socket.on('error', this.handleError);
      this.socket.on('activity', this.handleActivity);

      // Update connection state
      this.updateConnectionState('reconnecting', 'Connecting to server...');
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      this.updateConnectionState('disconnected', 'Failed to connect to server');
      this.scheduleReconnect();
    }
  }

  // Disconnect the WebSocket
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Clear any pending reconnect timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clear polling interval
    this.stopPolling();

    // Reset state
    this.reconnectAttempts = 0;
    this.updateConnectionState('disconnected', 'Disconnected from server');
  }

  // Add an event listener
  public addEventListener(listener: EventListener): () => void {
    this.listeners.push(listener);
    
    // Return a function to remove the listener
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Get current connection state
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // Enable fallback polling
  public enablePolling(): void {
    this.pollingEnabled = true;
    
    // If we're disconnected, start polling immediately
    if (this.connectionState === 'disconnected') {
      this.startPolling();
    }
  }

  // Disable fallback polling
  public disablePolling(): void {
    this.pollingEnabled = false;
    this.stopPolling();
  }

  // Handle successful connection
  private handleConnect = (): void => {
    this.reconnectAttempts = 0;
    this.updateConnectionState('connected', 'Connected to server');
    
    // Stop polling if it was active
    this.stopPolling();
  };

  // Handle disconnection
  private handleDisconnect = (): void => {
    this.updateConnectionState('disconnected', 'Disconnected from server');
    this.scheduleReconnect();
    
    // Start polling if enabled
    if (this.pollingEnabled) {
      this.startPolling();
    }
  };

  // Handle connection error
  private handleError = (error: any): void => {
    console.error('WebSocket error:', error);
    this.updateConnectionState('disconnected', `Connection error: ${error.message || 'Unknown error'}`);
    this.scheduleReconnect();
    
    // Start polling if enabled
    if (this.pollingEnabled) {
      this.startPolling();
    }
  };

  // Handle incoming activity
  private handleActivity = (activity: Activity): void => {
    // Notify all listeners
    this.notifyListeners({
      type: 'activity',
      data: activity
    });
  };

  // Schedule reconnection with exponential backoff
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Maximum reconnection attempts reached');
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      30000, // Max 30 seconds
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts)
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.updateConnectionState('reconnecting', `Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  // Update connection state and notify listeners
  private updateConnectionState(state: ConnectionState, message?: string): void {
    this.connectionState = state;
    
    // Notify all listeners
    this.notifyListeners({
      type: 'connection',
      state,
      message
    });
  }

  // Notify all listeners of an event
  private notifyListeners(event: RealTimeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  // Start polling for activities as a fallback
  private startPolling(): void {
    if (this.pollingInterval) {
      return; // Already polling
    }

    this.pollingInterval = setInterval(async () => {
      try {
        // Fetch latest activities
        const response = await fetch('/api/activities?limit=10');
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        
        // Process each activity
        if (Array.isArray(data.activities)) {
          data.activities.forEach((activity: Activity) => {
            this.handleActivity(activity);
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, this.pollingDelay);
  }

  // Stop polling
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

// Create a singleton instance
export const realTimeService = new RealTimeService();

export default realTimeService;