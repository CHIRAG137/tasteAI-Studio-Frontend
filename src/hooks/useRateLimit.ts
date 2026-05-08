import { useState, useEffect, useCallback } from 'react';

interface RateLimitState {
  isLimited: boolean;
  remainingTime: number;
  retryAfter: number;
  lastRequestTime: number | null;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  key: string; // unique key for localStorage
}

export const useRateLimit = (config: RateLimitConfig) => {
  const { maxRequests, windowMs, key } = config;
  const storageKey = `ratelimit_${key}`;

  const getInitialState = useCallback((): RateLimitState => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        if (parsed.retryAfter && now < parsed.retryAfter) {
          return {
            isLimited: true,
            remainingTime: Math.max(0, parsed.retryAfter - now),
            retryAfter: parsed.retryAfter,
            lastRequestTime: parsed.lastRequestTime
          };
        }
      } catch (e) {
        // Ignore invalid stored data
      }
    }
    return {
      isLimited: false,
      remainingTime: 0,
      retryAfter: 0,
      lastRequestTime: null
    };
  }, [storageKey]);

  const [state, setState] = useState<RateLimitState>(getInitialState);

  // Update countdown timer
  useEffect(() => {
    if (!state.isLimited) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, state.retryAfter - now);

      if (remaining <= 0) {
        setState(prev => ({
          ...prev,
          isLimited: false,
          remainingTime: 0,
          retryAfter: 0
        }));
        localStorage.removeItem(storageKey);
        window.dispatchEvent(new CustomEvent('ratelimit:update', { detail: { key } }));
      } else {
        setState(prev => ({
          ...prev,
          remainingTime: remaining
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isLimited, state.retryAfter, key, storageKey]);

  useEffect(() => {
    const syncFromStorage = () => {
      setState(getInitialState());
    };

    const onStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey) {
        syncFromStorage();
      }
    };

    const onRateLimitUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string }>;
      if (!customEvent.detail?.key || customEvent.detail.key === key) {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', onStorageChange);
    window.addEventListener('ratelimit:update', onRateLimitUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', onStorageChange);
      window.removeEventListener('ratelimit:update', onRateLimitUpdate as EventListener);
    };
  }, [getInitialState, key, storageKey]);

  const recordRequest = useCallback(() => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      lastRequestTime: now
    }));
  }, []);

  const handleRateLimitError = useCallback((retryAfterSeconds: number) => {
    const now = Date.now();
    const retryAfter = now + (retryAfterSeconds * 1000);

    const newState = {
      isLimited: true,
      remainingTime: retryAfterSeconds * 1000,
      retryAfter,
      lastRequestTime: state.lastRequestTime
    };

    setState(newState);

    // Store in localStorage
    localStorage.setItem(storageKey, JSON.stringify({
      retryAfter,
      lastRequestTime: state.lastRequestTime
    }));
    window.dispatchEvent(new CustomEvent('ratelimit:update', { detail: { key } }));
  }, [key, state.lastRequestTime, storageKey]);

  const formatTimeRemaining = useCallback((ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }, []);

  return {
    isLimited: state.isLimited,
    remainingTime: state.remainingTime,
    retryAfter: state.retryAfter,
    lastRequestTime: state.lastRequestTime,
    recordRequest,
    handleRateLimitError,
    formatTimeRemaining,
    canMakeRequest: !state.isLimited
  };
};