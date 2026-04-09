import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Settings as SettingsIcon,
  Sun,
} from 'lucide-react';
import { getUpdaterStateSnapshot } from '@/services/updater';
import { NAV_ITEMS } from '../constants';
import type { View } from '../types';

interface AppSidebarProps {
  view: View;
  onViewChange: (view: View) => void;
  isCollapsed: boolean;
  resolvedSidebarWidth: number;
  sidebarResizing: boolean;
  windowNarrow: boolean;
  sidebarToggleTop: number;
  onToggleSidebarCollapsed: () => void;
  onSidebarResizePointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  theme: string;
  themeTone: 'light' | 'dark';
  onToggleTheme: () => void;
  updaterState: ReturnType<typeof getUpdaterStateSnapshot>;
}

export function AppSidebar({
  view,
  onViewChange,
  isCollapsed,
  resolvedSidebarWidth,
  sidebarResizing,
  windowNarrow,
  sidebarToggleTop,
  onToggleSidebarCollapsed,
  onSidebarResizePointerDown,
  theme,
  themeTone,
  onToggleTheme,
  updaterState,
}: AppSidebarProps) {
  const hasUpdateAction =
    updaterState.status === 'available' ||
    updaterState.status === 'ready-to-restart' ||
    updaterState.status === 'downloading' ||
    updaterState.status === 'installing';

  return (
    <aside
      className="sidebar relative shrink-0 h-full flex flex-col transition-all duration-200"
      style={{
        width: `${resolvedSidebarWidth}px`,
        transition: sidebarResizing ? 'none' : undefined,
      }}
    >
      <div
        data-tauri-drag-region
        className="h-12 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as CSSProperties}
      />

      <nav
        className={`flex-1 overflow-auto flex flex-col ${isCollapsed ? 'px-2 mt-2' : 'px-3 mt-2'}`}
      >
        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map((item, index) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`stagger-item w-full flex items-center rounded-lg transition-all duration-200 ${
                view === item.id ? 'nav-item-active' : 'nav-item'
              } ${isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <item.icon
                className="w-[18px] h-[18px] shrink-0"
                style={{ opacity: view === item.id ? 1 : 0.7 }}
              />
              {!isCollapsed && item.label}
            </button>
          ))}
        </div>

        <div className="mt-auto pb-4 pt-4 flex flex-col gap-1">
          <button
            onClick={onToggleTheme}
            title={`Theme: ${theme}`}
            aria-label={`Switch theme (current: ${theme})`}
            className={`w-full flex items-center rounded-lg transition-all duration-200 nav-item ${isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'}`}
          >
            <div
              style={{
                transition: 'transform 0.3s var(--ease-spring)',
                transform:
                  themeTone === 'dark'
                    ? 'rotate(0deg) scale(1)'
                    : 'rotate(180deg) scale(1.1)',
              }}
            >
              {themeTone === 'dark' ? (
                <Sun className="w-[18px] h-[18px] opacity-70" />
              ) : (
                <Moon className="w-[18px] h-[18px] opacity-70" />
              )}
            </div>
            {!isCollapsed && <span className="flex-1 text-left">Theme</span>}
          </button>

          <button
            onClick={() => onViewChange('settings')}
            title={isCollapsed ? 'Settings' : undefined}
            className={`w-full flex items-center rounded-lg transition-all duration-200 ${
              view === 'settings' ? 'nav-item-active' : 'nav-item'
            } ${isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'}`}
          >
            <span className="relative shrink-0">
              <SettingsIcon
                className="w-[18px] h-[18px]"
                style={{ opacity: view === 'settings' ? 1 : 0.7 }}
              />
              {hasUpdateAction && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
                  <span
                    className="w-[7px] h-[7px] rounded-full"
                    style={{
                      backgroundColor:
                        updaterState.status === 'ready-to-restart'
                          ? 'var(--accent-emerald)'
                          : 'var(--brand-primary)',
                      boxShadow: `0 0 0 1.5px var(--bg-surface), 0 0 4px ${
                        updaterState.status === 'ready-to-restart'
                          ? 'var(--accent-emerald)'
                          : 'var(--brand-primary)'
                      }`,
                    }}
                  />
                </span>
              )}
            </span>
            {!isCollapsed && <span className="flex-1 text-left">Settings</span>}
            {!isCollapsed && hasUpdateAction && (
              <span
                className="text-[10px] font-semibold leading-none px-1.5 py-[3px] rounded-full"
                style={{
                  backgroundColor:
                    updaterState.status === 'ready-to-restart'
                      ? 'var(--accent-emerald-muted)'
                      : 'var(--brand-primary-light)',
                  color:
                    updaterState.status === 'ready-to-restart'
                      ? 'var(--accent-emerald)'
                      : 'var(--brand-text)',
                }}
              >
                {updaterState.status === 'ready-to-restart' ? 'Restart' : 'Update'}
              </span>
            )}
          </button>
        </div>
      </nav>

      {!windowNarrow && (
        <button
          type="button"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="sidebar-seam-toggle"
          onClick={onToggleSidebarCollapsed}
          style={
            {
              top: `${sidebarToggleTop}px`,
              WebkitAppRegion: 'no-drag',
            } as CSSProperties
          }
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {!isCollapsed && !windowNarrow && (
        <button
          type="button"
          aria-label="Resize sidebar"
          className={`sidebar-resize-handle ${sidebarResizing ? 'is-active' : ''}`}
          onPointerDown={onSidebarResizePointerDown}
          style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
          title="Resize sidebar"
        />
      )}
    </aside>
  );
}
