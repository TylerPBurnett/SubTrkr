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

const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'categories', label: 'Categories', icon: <Tag className="w-4 h-4" /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { key: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
];

export default function Settings({ categories, onCategoriesChange }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('categories');

  return (
    <div className="max-w-2xl">
      {/* Page Header */}
      <div className="mb-8">
        <h2
          className="text-3xl"
          style={{
            color: 'var(--text-primary)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          Settings
        </h2>
        <p
          className="mt-2 text-base"
          style={{
            color: 'var(--text-secondary)',
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          Manage your categories, notifications, and account
        </p>
      </div>

      {/* Tab Bar */}
      <div
        className="inline-flex rounded-xl p-1 gap-1 mb-8"
        style={{ backgroundColor: 'var(--bg-hover)' }}
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === tab.key ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.key ? 'var(--shadow-card)' : 'none',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'categories' && (
        <CategorySettings
          categories={categories}
          onCategoriesChange={onCategoriesChange}
        />
      )}

      {activeTab === 'notifications' && (
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
      )}

      {activeTab === 'account' && <AccountSettings />}
    </div>
  );
}
