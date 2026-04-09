import { useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { DEFAULT_THEME, getNextTheme, getThemeTone, isTheme } from '@/theme';

export function useAppTheme() {
  const [storedTheme, setStoredTheme] = useLocalStorage<string>(
    'subtrkr-theme',
    DEFAULT_THEME,
  );
  const [useVibrancy, setUseVibrancy] = useLocalStorage<boolean>(
    'subtrkr-vibrancy',
    true,
  );
  const theme = isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  const themeTone = getThemeTone(theme);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-vibrancy',
      useVibrancy ? 'true' : 'false',
    );
  }, [useVibrancy]);

  useEffect(() => {
    if (!isTheme(storedTheme)) {
      setStoredTheme(DEFAULT_THEME);
    }
  }, [storedTheme, setStoredTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', themeTone === 'dark');
  }, [theme, themeTone]);

  return {
    theme,
    themeTone,
    useVibrancy,
    setUseVibrancy,
    toggleTheme: () => {
      setStoredTheme((prev) =>
        getNextTheme(isTheme(prev) ? prev : DEFAULT_THEME),
      );
    },
  };
}
