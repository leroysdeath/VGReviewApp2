import { useEffect, useRef, useCallback } from 'react';
import { cleanupManager, CleanupFunction } from '../services/cleanupManager';

/**
 * React hook for automatic cleanup management
 * Automatically cleans up all registered resources when component unmounts
 */
export function useCleanupManager(componentName?: string) {
  const componentId = useRef(componentName || `component-${Math.random().toString(36).substr(2, 9)}`);
  const cleanupFunctions = useRef<Map<string, () => void>>(new Map());

  /**
   * Register a cleanup function
   */
  const registerCleanup = useCallback((
    id: string,
    cleanup: CleanupFunction,
    type?: 'subscription' | 'timer' | 'listener' | 'observer' | 'fetch' | 'websocket' | 'other'
  ) => {
    const fullId = `${componentId.current}-${id}`;
    const unregister = cleanupManager.register(fullId, cleanup, {
      component: componentId.current,
      type
    });
    
    cleanupFunctions.current.set(id, unregister);
    return unregister;
  }, []);

  /**
   * Register a timer with automatic cleanup
   */
  const registerTimer = useCallback((
    callback: () => void,
    delay: number,
    id?: string
  ): NodeJS.Timeout => {
    const timerId = id || `timer-${Date.now()}`;
    const fullId = `${componentId.current}-${timerId}`;
    
    const timer = cleanupManager.registerTimer(
      fullId,
      callback,
      delay,
      componentId.current
    );
    
    return timer;
  }, []);

  /**
   * Register an interval with automatic cleanup
   */
  const registerInterval = useCallback((
    callback: () => void,
    interval: number,
    id?: string
  ): NodeJS.Timeout => {
    const intervalId = id || `interval-${Date.now()}`;
    const fullId = `${componentId.current}-${intervalId}`;
    
    const timer = cleanupManager.registerInterval(
      fullId,
      callback,
      interval,
      componentId.current
    );
    
    return timer;
  }, []);

  /**
   * Register an abort controller for fetch requests
   */
  const registerAbortController = useCallback((id?: string): AbortController => {
    const controller = new AbortController();
    const controllerId = id || `abort-${Date.now()}`;
    
    registerCleanup(controllerId, () => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    }, 'fetch');
    
    return controller;
  }, [registerCleanup]);

  /**
   * Cleanup a specific resource
   */
  const cleanup = useCallback((id: string) => {
    const fullId = `${componentId.current}-${id}`;
    cleanupManager.cleanup(fullId);
    
    const localCleanup = cleanupFunctions.current.get(id);
    if (localCleanup) {
      localCleanup();
      cleanupFunctions.current.delete(id);
    }
  }, []);

  /**
   * Cleanup all resources for this component
   */
  const cleanupAll = useCallback(() => {
    // Cleanup via manager
    cleanupManager.cleanupByComponent(componentId.current);
    
    // Cleanup local functions
    cleanupFunctions.current.forEach(fn => fn());
    cleanupFunctions.current.clear();
  }, []);

  /**
   * Auto-cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  return {
    registerCleanup,
    registerTimer,
    registerInterval,
    registerAbortController,
    cleanup,
    cleanupAll,
    componentId: componentId.current
  };
}

/**
 * Higher-order component that provides cleanup management
 */
export function withCleanupManager<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function WithCleanupManagerComponent(props: P) {
    const cleanup = useCleanupManager(componentName);
    
    // Pass cleanup utilities as props
    const enhancedProps = {
      ...props,
      cleanup
    } as P & { cleanup: ReturnType<typeof useCleanupManager> };
    
    return <Component {...enhancedProps} />;
  };
}

export default useCleanupManager;