import { useState, useCallback } from 'react';

type SetValue<T> = (value: T | ((val: T) => T)) => void;

/**
 * Hook for managing values in localStorage with type safety
 * Works like useState but persists to localStorage
 * @param key - The localStorage key
 * @param defaultValue - Default value if key doesn't exist in localStorage
 * @returns [value, setValue] - Current value and setter function (supports both direct values and updater functions)
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;

      // Try to parse as JSON
      return JSON.parse(item) as T;
    } catch (error) {
      // If parse fails, clear the corrupted value and use default
      console.warn(`Failed to read localStorage key "${key}":`, error);
      console.warn(`Clearing corrupted value and using default`);
      localStorage.removeItem(key);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback<SetValue<T>>((newValue) => {
    try {
      setValue((current) => {
        const valueToStore = newValue instanceof Function ? newValue(current) : newValue;
        localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (error) {
      console.error(`Failed to set localStorage key "${key}":`, error);
    }
  }, [key]);

  return [value, setStoredValue];
}
