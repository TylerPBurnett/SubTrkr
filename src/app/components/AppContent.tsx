import { Suspense, lazy } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Category, ItemType, ItemWithCategory, StatusChangeData } from '@/types';
import type { BulkCopy, BulkResult } from '@/services/database';
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
  onBulkDelete: (
    ids: string[],
    labels: { singular: string; plural: string },
  ) => Promise<BulkResult>;
  onBulkStatusChange: (
    ids: string[],
    data: StatusChangeData,
    copy: BulkCopy,
    /** selected but ineligible ids, surfaced in the toast as "· N skipped" */
    skippedIds?: string[],
  ) => Promise<BulkResult>;
  onBulkCategoryChange: (
    ids: string[],
    categoryId: string | null,
    labels: { singular: string; plural: string },
  ) => Promise<BulkResult>;
  onToggleActive: (id: string) => void;
  onStatusChange: (itemId: string, action: StatusChangeData['action']) => void;
  onViewHistory: (item: ItemWithCategory) => void;
  onAddNew: (itemType: ItemType) => void;
  onCategoriesChange: () => void;
  useVibrancy: boolean;
  setUseVibrancy: (val: boolean | ((prev: boolean) => boolean)) => void;
  settingsTab: SettingsTab;
  onSettingsTabChange: (tab: SettingsTab) => void;
  /** True while any App-level modal is open; suppresses ItemList's shortcuts. */
  isModalOpen: boolean;
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
  onBulkDelete,
  onBulkStatusChange,
  onBulkCategoryChange,
  onToggleActive,
  onStatusChange,
  onViewHistory,
  onAddNew,
  onCategoriesChange,
  useVibrancy,
  setUseVibrancy,
  settingsTab,
  onSettingsTabChange,
  isModalOpen,
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
              onBulkDelete={onBulkDelete}
              onBulkStatusChange={onBulkStatusChange}
              onBulkCategoryChange={onBulkCategoryChange}
              onToggleActive={onToggleActive}
              onStatusChange={onStatusChange}
              onViewHistory={onViewHistory}
              onAddNew={() => onAddNew('bill')}
              isModalOpen={isModalOpen}
            />
          )}

          {view === 'subscriptions' && (
            <ItemList
              items={items}
              categories={categories}
              itemType="subscription"
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onBulkDelete={onBulkDelete}
              onBulkStatusChange={onBulkStatusChange}
              onBulkCategoryChange={onBulkCategoryChange}
              onToggleActive={onToggleActive}
              onStatusChange={onStatusChange}
              onViewHistory={onViewHistory}
              onAddNew={() => onAddNew('subscription')}
              isModalOpen={isModalOpen}
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
