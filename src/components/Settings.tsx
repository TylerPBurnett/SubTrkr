import { useState, Suspense, lazy } from 'react';
import { Tag, Bell, User } from 'lucide-react';
import type { Category } from '../types';
import CategorySettings from './CategorySettings';
import AccountSettings from './AccountSettings';

const NotificationSettings = lazy(() => import('./NotificationSettings'));

interface SettingsProps {
  categories: Category[];
  onCategoriesChange: () => void;
}

type SettingsTab = 'categories' | 'notifications' | 'account';

const TabIcons = {
  categories: Tag,
  notifications: Bell,
  account: User,
} as const;

const tabs: { key: SettingsTab; label: string; Icon: typeof Tag }[] = [
  { key: 'categories', label: 'Categories', Icon: TabIcons.categories },
  { key: 'notifications', label: 'Notifications', Icon: TabIcons.notifications },
  { key: 'account', label: 'Account', Icon: TabIcons.account },
];

export default function Settings({ categories, onCategoriesChange }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('categories');
  const [hoveredTab, setHoveredTab] = useState<SettingsTab | null>(null);

  return (
    <div className="max-w-2xl">
      {/* Refined Tab Navigation */}
      <div className="relative mb-10">
        {/* Tab Bar Container with subtle depth */}
        <div
          className="relative inline-flex rounded-2xl p-1.5 gap-1"
          style={{
            backgroundColor: 'var(--settings-tabs-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--settings-tabs-border)',
            boxShadow: 'var(--settings-tabs-shadow)',
          }}
        >
          {tabs.map((tab, index) => {
            const Icon = tab.Icon;
            const isActive = activeTab === tab.key;
            const isHovered = hoveredTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                onMouseEnter={() => setHoveredTab(tab.key)}
                onMouseLeave={() => setHoveredTab(null)}
                className="relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-300"
                style={{
                  backgroundColor: isActive
                    ? 'var(--settings-tab-active-bg)'
                    : isHovered
                    ? 'var(--settings-tab-hover-bg)'
                    : 'transparent',
                  color: isActive ? 'var(--settings-tab-active-text)' : 'var(--settings-tab-inactive-text)',
                  boxShadow: isActive ? 'var(--settings-tab-active-shadow)' : 'none',
                  transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                  letterSpacing: '-0.01em',
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                {/* Icon with subtle glow on active */}
                <Icon
                  className="w-[15px] h-[15px] transition-all duration-300"
                  style={{
                    filter: isActive ? 'var(--settings-tab-icon-glow)' : 'none',
                    color: isActive ? 'var(--settings-tab-icon-active)' : 'inherit',
                  }}
                />

                {/* Label */}
                <span className="relative">
                  {tab.label}

                  {/* Active indicator - subtle gradient underline */}
                  {isActive && (
                    <span
                      className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full transition-opacity duration-300"
                      style={{
                        background: 'linear-gradient(90deg, transparent, var(--brand-primary), transparent)',
                        opacity: 0.6,
                      }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Ambient glow beneath tabs */}
        <div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 rounded-full blur-2xl"
          style={{
            background: 'radial-gradient(ellipse, var(--brand-primary), transparent 70%)',
            opacity: 'var(--settings-tab-ambient-opacity)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'categories' ? (
        <CategorySettings
          categories={categories}
          onCategoriesChange={onCategoriesChange}
        />
      ) : null}

      {activeTab === 'notifications' ? (
        <Suspense
          fallback={
            <div className="card">
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>Loading notification settings...</span>
              </div>
            </div>
          }
        >
          <NotificationSettings />
        </Suspense>
      ) : null}

      {activeTab === 'account' ? <AccountSettings /> : null}
    </div>
  );
}
