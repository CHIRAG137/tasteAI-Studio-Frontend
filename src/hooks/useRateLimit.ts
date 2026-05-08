import { useState, useEffect, useCallback } from 'react';

interface RateLimitState {
  isLimited: boolean;
  remainingTime: number;
  retryAfter: number;
  lastRequestTime: number | null;
  requests: number[];
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  key: string; // unique key for localStorage
}

export const useRateLimit = (config: RateLimitConfig) => {
  const { maxRequests, windowMs, key } = config;
  const storageKey = `ratelimit_${key}`;

  const getActiveRequests = useCallback(
    (requests: number[] = [], now: number) => requests.filter((timestamp) => now - timestamp < windowMs),
    [windowMs]
  );

  const getInitialState = useCallback((): RateLimitState => {
    const now = Date.now();
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const requests = getActiveRequests(Array.isArray(parsed.requests) ? parsed.requests : [], now);
        const oldestRequest = requests[0];
        const reachedLimit = requests.length >= maxRequests;
        const computedRetryAfter = reachedLimit && oldestRequest ? oldestRequest + windowMs : 0;
        const forcedRetryAfter = typeof parsed.retryAfter === "number" ? parsed.retryAfter : 0;
        const retryAfter = Math.max(computedRetryAfter, forcedRetryAfter);
        const isLimited = retryAfter > now;

        return {
          isLimited,
          remainingTime: isLimited ? Math.max(0, retryAfter - now) : 0,
          retryAfter: isLimited ? retryAfter : 0,
          lastRequestTime: parsed.lastRequestTime ?? (requests.length ? requests[requests.length - 1] : null),
          requests
        };
      } catch (e) {
        // Ignore invalid stored data
      }
    }
    return {
      isLimited: false,
      remainingTime: 0,
      retryAfter: 0,
      lastRequestTime: null,
      requests: []
    };
  }, [getActiveRequests, maxRequests, storageKey, windowMs]);

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
    setState((prev) => {
      const requests = getActiveRequests([...prev.requests, now], now);
      const oldestRequest = requests[0];
      const reachedLimit = requests.length >= maxRequests;
      const retryAfter = reachedLimit && oldestRequest ? oldestRequest + windowMs : 0;
      const isLimited = reachedLimit && retryAfter > now;

      const newState = {
        ...prev,
        isLimited,
        remainingTime: isLimited ? Math.max(0, retryAfter - now) : 0,
        retryAfter: isLimited ? retryAfter : 0,
        lastRequestTime: now,
        requests
      };

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          retryAfter: newState.retryAfter || null,
          lastRequestTime: newState.lastRequestTime,
          requests: newState.requests
        })
      );
      window.dispatchEvent(new CustomEvent('ratelimit:update', { detail: { key } }));
      return newState;
    });
  }, [getActiveRequests, key, maxRequests, storageKey, windowMs]);

  const handleRateLimitError = useCallback((retryAfterSeconds: number) => {
    const now = Date.now();
    const retryAfter = now + (retryAfterSeconds * 1000);

    const newState = {
      isLimited: true,
      remainingTime: retryAfterSeconds * 1000,
      retryAfter,
      lastRequestTime: state.lastRequestTime,
      requests: state.requests
    };

    setState(newState);

    // Store in localStorage
    localStorage.setItem(storageKey, JSON.stringify({
      retryAfter,
      lastRequestTime: state.lastRequestTime,
      requests: state.requests
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