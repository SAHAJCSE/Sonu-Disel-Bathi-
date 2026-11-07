import { useState, useEffect, useCallback } from 'react';

/**
 * Custom debounce hook with instant flush support for 'Clear All' actions
 * and a live `isDebouncing` status flag for responsive UI feedback.
 */
export function useDebounce<T>(value: T, delayMs = 220) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delayMs]);

  const flushNow = useCallback((immediateValue: T) => {
    setDebouncedValue(immediateValue);
  }, []);

  const isDebouncing = value !== debouncedValue;

  return { debouncedValue, isDebouncing, flushNow };
}
