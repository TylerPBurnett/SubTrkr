import { Suspense, lazy } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Category, ItemType, ItemWithCategory, StatusChangeData } from '@/types';
import Dashboard from '@/components/Dashboard';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import ItemList from '@/components/ItemList';
import { LazyComponentFallback } from '@/components/LazyComponentFallback';
import TitleBar from '@/components/TitleBar';
import type { SettingsTab } from '@/components/Settings';
import { VIEW_CONTENT } from '../constants';
import type { View } from '../types';

const Analytics = lazy(() => import('@/components/Analytics'));
const Settings = lazy(() => import('@/components/Settings'));

interface AppContentProps {
  session: Session;
  emailBannerDismissed: boolean;
  onDismissEmailBanner: () => void;
  view: View;
  isPending: boolean;
  items: ItemWithCategory[];
  categories: Category[];
  onViewChange: (view: View) => void;
  onEditItem: (item: ItemWithCategory) => void;
  onDeleteItem: (id: string) => void;
  onToggleActive: (id: string) => void;
  onStatusChange: (itemId: string, action: StatusChangeData['action']) => void;
  onViewHistory: (item: ItemWithCategory) => void;
  onAddNew: (itemType: ItemType) => void;
  onCategoriesChange: () => void;
  useVibrancy: boolean;
  setUseVibrancy: (val: boolean | ((prev: boolean) => boolean)) => void;
  settingsTab: SettingsTab;
  onSettingsTabChange: (tab: SettingsTab) => void;
}

export function AppContent({
  session,
  emailBannerDismissed,
  onDismissEmailBanner,
  view,
  isPending,
  items,
  categories,
  onViewChange,
  onEditItem,
  onDeleteItem,
  onToggleActive,
  onStatusChange,
  onViewHistory,
  onAddNew,
  onCategoriesChange,
  useVibrancy,
  setUseVibrancy,
  settingsTab,
  onSettingsTabChange,
}: AppContentProps) {
  const viewContent = VIEW_CONTENT[view];

  return (
    <main className="main-content flex-1 min-w-0 h-full flex flex-col">
      <TitleBar />

      {session.user && !session.user.email_confirmed_at && !emailBannerDismissed && (
        <EmailVerificationBanner
          email={session.user.email || ''}
          onDismiss={onDismissEmailBanner}
        />
      )}

      <div
        className="page-scroll flex-1 overflow-auto relative"
        style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}
      >
        <header className="page-header">
          <div className="page-header-copy">
            <p className="page-header-label">{viewContent.label}</p>
            <h2 className="page-header-title">{viewContent.title}</h2>
            <p className="page-header-description">{viewContent.description}</p>
          </div>
        </header>

        <div className="page-body">
          {view === 'dashboard' && (
            <Dashboard
              items={items}
              categories={categories}
              onEdit={onEditItem}
              onViewAll={() => onViewChange('subscriptions')}
              onAddNew={() => onAddNew('subscription')}
            />
          )}

          {view === 'bills' && (
            <ItemList
              items={items}
              categories={categories}
              itemType="bill"
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onToggleActive={onToggleActive}
              onStatusChange={onStatusChange}
              onViewHistory={onViewHistory}
              onAddNew={() => onAddNew('bill')}
            />
          )}

          {view === 'subscriptions' && (
            <ItemList
              items={items}
              categories={categories}
              itemType="subscription"
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onToggleActive={onToggleActive}
              onStatusChange={onStatusChange}
              onViewHistory={onViewHistory}
              onAddNew={() => onAddNew('subscription')}
            />
          )}

          {view === 'analytics' && (
            <ErrorBoundary>
              <Suspense fallback={<LazyComponentFallback />}>
                <Analytics items={items} categories={categories} />
              </Suspense>
            </ErrorBoundary>
          )}

          {view === 'settings' && (
            <ErrorBoundary>
              <Suspense fallback={<LazyComponentFallback />}>
                <Settings
                  categories={categories}
                  onCategoriesChange={onCategoriesChange}
                  useVibrancy={useVibrancy}
                  setUseVibrancy={setUseVibrancy}
                  activeTab={settingsTab}
                  onActiveTabChange={onSettingsTabChange}
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </div>
    </main>
  );
}
