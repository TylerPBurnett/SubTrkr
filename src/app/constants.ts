import {
  BarChart3,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Receipt,
  type LucideIcon,
} from 'lucide-react';
import type { View } from './types';

export const VIEW_CONTENT: Record<
  View,
  { label: string; title: string; description: string }
> = {
  dashboard: {
    label: 'Overview',
    title: 'Dashboard',
    description: 'Your spending overview at a glance',
  },
  calendar: {
    label: 'Planning',
    title: 'Calendar',
    description: 'Your bills and subscriptions across time',
  },
  bills: {
    label: 'Utilities',
    title: 'Bills',
    description: 'Manage your recurring bills and utilities',
  },
  subscriptions: {
    label: 'Services',
    title: 'Subscriptions',
    description: 'Manage all your recurring subscriptions',
  },
  analytics: {
    label: 'Insights',
    title: 'Analytics',
    description: 'Spending insights and trends',
  },
  settings: {
    label: 'Preferences',
    title: 'Settings',
    description: 'Configure your preferences',
  },
};

export const NAV_ITEMS: Array<{
  id: Exclude<View, 'settings'>;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'bills', label: 'Bills', icon: Receipt },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const SIDEBAR_MAC_COLLAPSED_WIDTH = 76;
export const SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 420;
export const SIDEBAR_AUTO_COLLAPSE_BREAKPOINT = 900;
export const SIDEBAR_SEAM_TOGGLE_TOP = 56;
export const SIDEBAR_MAC_SEAM_TOGGLE_TOP = 84;

export function clampSidebarWidth(width: number): number {
  const safeWidth = Number.isFinite(width) ? width : SIDEBAR_DEFAULT_WIDTH;

  return Math.min(
    SIDEBAR_MAX_WIDTH,
    Math.max(SIDEBAR_MIN_WIDTH, Math.round(safeWidth)),
  );
}
