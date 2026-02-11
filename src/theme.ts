export type ThemeTone = 'light' | 'dark';

export const THEME_OPTIONS = [
  { id: 'dark', label: 'Dark', tone: 'dark' },
  { id: 'light', label: 'Light', tone: 'light' },
] as const;

export type Theme = (typeof THEME_OPTIONS)[number]['id'];

export const DEFAULT_THEME: Theme = 'dark';

function themeOption(theme: Theme) {
  return THEME_OPTIONS.find((option) => option.id === theme) || THEME_OPTIONS[0];
}

export function isTheme(value: string): value is Theme {
  return THEME_OPTIONS.some((option) => option.id === value);
}

export function getNextTheme(theme: Theme): Theme {
  const currentIndex = THEME_OPTIONS.findIndex((option) => option.id === theme);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % THEME_OPTIONS.length : 0;
  return THEME_OPTIONS[nextIndex].id;
}

export function getThemeTone(theme: Theme): ThemeTone {
  return themeOption(theme).tone;
}
