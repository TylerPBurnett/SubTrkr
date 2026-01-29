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
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      console.warn(`Failed to read localStorage key "${key}":`, key);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback<SetValue<T>>((newValue) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Failed to set localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setStoredValue];
}
