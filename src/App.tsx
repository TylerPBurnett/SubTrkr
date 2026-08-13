import { useCallback, useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import { MotionConfig } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import ErrorBoundary from '@/components/ErrorBoundary';
import AuthScreen from '@/components/AuthScreen';
import ItemForm from '@/components/ItemForm';
import SetNewPassword from '@/components/SetNewPassword';
import StatusChangeDialog from '@/components/StatusChangeDialog';
import StatusHistoryDialog from '@/components/StatusHistoryDialog';
import type { SettingsTab } from '@/components/Settings';
import {
  createItem,
  deleteItem,
  deleteItems,
  executeStatusChange,
  executeStatusChangeForItems,
  summarizeBulkResult,
  toggleItemActive,
  updateItem,
  updateItemsCategory,
  type BulkCopy,
  type BulkResult,
} from '@/services/database';
import {
  getUpdaterStateSnapshot,
  installAvailableUpdate,
  subscribeToUpdaterState,
} from '@/services/updater';
import type { ItemType, ItemWithCategory, StatusChangeData } from '@/types';
import { AppContent } from '@/app/components/AppContent';
import { AppSidebar } from '@/app/components/AppSidebar';
import { useAppDataSync } from '@/app/hooks/useAppDataSync';
import { useAppSession } from '@/app/hooks/useAppSession';
import { useAppTheme } from '@/app/hooks/useAppTheme';
import { useAppUpdateNotifications } from '@/app/hooks/useAppUpdateNotifications';
import { useGlobalShortcuts } from '@/app/hooks/useGlobalShortcuts';
import { useSidebarLayout } from '@/app/hooks/useSidebarLayout';
import type { View } from '@/app/types';

const APP_VERSION = __APP_VERSION__;

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span
          className="text-2xl select-none"
          style={{
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
          }}
        >
          {/* Wordmark, so this one stays raw --brand-primary: WCAG exempts
              logotypes from the contrast floor. Everywhere else green words
              use --brand-text. */}
          Sub<span style={{ color: 'var(--brand-primary)' }}>Trkr</span>
        </span>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: 'var(--brand-primary)',
            borderTopColor: 'transparent',
          }}
        />
      </div>
    </div>
  );
}

function OfflineScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div
        className="max-w-md w-full card p-8 text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
        }}
      >
        <WifiOff
          className="w-16 h-16 mx-auto mb-4"
          style={{ color: 'var(--text-muted)' }}
        />
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          No Internet Connection
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          SubTrkr requires an internet connection to work. Please check your
          network and try again.
        </p>
      </div>
    </div>
  );
}

function App() {
  const [isPending, startTransition] = useTransition();
  const updaterState = useSyncExternalStore(
    subscribeToUpdaterState,
    getUpdaterStateSnapshot,
  );
  const { theme, themeTone, useVibrancy, setUseVibrancy, toggleTheme } =
    useAppTheme();
  const { session, authLoading, showPasswordRecovery, setShowPasswordRecovery } =
    useAppSession();
  const { items, categories, isLoading, reloadItems, handleCategoriesChange } =
    useAppDataSync(session);
  const {
    isCollapsed,
    windowNarrow,
    resolvedSidebarWidth,
    sidebarResizing,
    sidebarToggleTop,
    toggleSidebarCollapsed,
    handleSidebarResizePointerDown,
  } = useSidebarLayout();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [view, setView] = useState<View>('dashboard');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('categories');
  const [showForm, setShowForm] = useState(false);
  const [formItemType, setFormItemType] = useState<ItemType>('subscription');
  const [editingItem, setEditingItem] = useState<ItemWithCategory | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [emailBannerDismissed, setEmailBannerDismissed] = useState(false);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    item: ItemWithCategory;
    action: StatusChangeData['action'];
  } | null>(null);
  const [historyDialogItem, setHistoryDialogItem] =
    useState<ItemWithCategory | null>(null);

  const handleViewChange = useCallback(
    (nextView: View) => {
      startTransition(() => setView(nextView));
    },
    [startTransition],
  );

  const handleInstallNow = useCallback(() => {
    setSettingsTab('account');
    handleViewChange('settings');
    installAvailableUpdate();
  }, [handleViewChange]);

  useAppUpdateNotifications({
    session,
    appVersion: APP_VERSION,
    onInstallNow: handleInstallNow,
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleAddNew = useCallback((itemType: ItemType) => {
    setEditingItem(null);
    setFormItemType(itemType);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingItem(null);
  }, []);

  const handleStatusChangeCancel = useCallback(() => {
    setStatusChangeDialog(null);
  }, []);

  useGlobalShortcuts({
    enabled: Boolean(session),
    showForm,
    hasStatusChangeDialog: Boolean(statusChangeDialog),
    windowNarrow,
    onAddNew: handleAddNew,
    onNavigateView: handleViewChange,
    onToggleSidebar: toggleSidebarCollapsed,
  });

  const handleCreateItem = useCallback(
    async (data: Parameters<typeof createItem>[0]) => {
      setIsSaving(true);
      try {
        await createItem(data);
        await reloadItems();
        setShowForm(false);
        toast.success('Item created');
      } catch (error) {
        console.error('Failed to create item:', error);
        toast.error('Failed to create item. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [reloadItems],
  );

  const handleUpdateItem = useCallback(
    async (id: string, data: Parameters<typeof updateItem>[1]) => {
      setIsSaving(true);
      try {
        await updateItem(id, data);
        await reloadItems();
        setEditingItem(null);
        setShowForm(false);
        toast.success('Item updated');
      } catch (error) {
        console.error('Failed to update item:', error);
        toast.error('Failed to update item. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [reloadItems],
  );

  const handleDeleteItem = useCallback(async (id: string) => {
    try {
      await deleteItem(id);
      await reloadItems();
      toast.success('Item deleted');
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to delete item. Please try again.');
    }
  }, [reloadItems]);

  /**
   * The single spine every bulk action runs through: one mutation, one refetch,
   * one toast — the whole point of the bulk path. Never call this in a loop.
   *
   * Three invariants it owns so no caller has to:
   * - the service call is wrapped, so a hard throw (no session, network) folds
   *   every id into `failed` instead of escaping;
   * - the refetch is wrapped too, so a stale list can never suppress the
   *   summary toast (the mutation already committed — reporting it is the
   *   truthful outcome, and the next realtime tick will resync the list);
   * - it never rejects, so the callers (ItemList's delete/category confirm and
   *   StatusChangeDialog's submit) can't mistake a refetch failure for a
   *   mutation failure and show contradictory copy.
   *
   * `skippedIds` are ids the caller filtered out as ineligible before ever
   * attempting them; they are merged in so the toast can report `· N skipped`.
   */
  const runBulkOperation = useCallback(
    async (
      ids: string[],
      copy: BulkCopy,
      operation: (batchIds: string[]) => Promise<BulkResult>,
      skippedIds: string[] = [],
    ): Promise<BulkResult> => {
      let result: BulkResult;

      try {
        result = await operation(ids);
      } catch (error) {
        // The services fold row-level errors into `failed`, so reaching here
        // means the call itself blew up. Report every id as failed so nothing
        // is cleared from the selection.
        console.error(`Failed to ${copy.failedVerb} items:`, error);
        result = {
          succeeded: [],
          failed: ids.map((id) => ({
            id,
            error: error instanceof Error ? error.message : String(error),
          })),
          skipped: [],
        };
      }

      if (skippedIds.length > 0) {
        result = {
          ...result,
          skipped: [...result.skipped, ...skippedIds],
        };
      }

      try {
        await reloadItems();
      } catch (error) {
        console.error('Failed to refresh items after bulk operation:', error);
      }

      const summary = summarizeBulkResult(result, copy);

      if (summary) {
        if (summary.tone === 'success') {
          toast.success(summary.message);
        } else {
          toast.error(summary.message);
        }
      }

      return result;
    },
    [reloadItems],
  );

  const handleBulkDelete = useCallback(
    (ids: string[], labels: { singular: string; plural: string }) =>
      runBulkOperation(
        ids,
        {
          pastTense: 'Deleted',
          failedVerb: 'delete',
          singular: labels.singular,
          plural: labels.plural,
        },
        deleteItems,
      ),
    [runBulkOperation],
  );

  const handleBulkStatusChange = useCallback(
    (
      ids: string[],
      data: StatusChangeData,
      copy: BulkCopy,
      skippedIds?: string[],
    ) =>
      runBulkOperation(
        ids,
        copy,
        (batchIds) => executeStatusChangeForItems(batchIds, data),
        skippedIds,
      ),
    [runBulkOperation],
  );

  // `categoryId: null` clears the category for the whole batch.
  const handleBulkCategoryChange = useCallback(
    (
      ids: string[],
      categoryId: string | null,
      labels: { singular: string; plural: string },
    ) =>
      runBulkOperation(
        ids,
        {
          pastTense: 'Moved',
          failedVerb: 'update',
          singular: labels.singular,
          plural: labels.plural,
        },
        (batchIds) => updateItemsCategory(batchIds, categoryId),
      ),
    [runBulkOperation],
  );

  const handleToggleActive = useCallback(async (id: string) => {
    try {
      await toggleItemActive(id);
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item. Please try again.');
    }
  }, []);

  const handleStatusChange = useCallback(
    async (itemId: string, action: StatusChangeData['action']) => {
      const item = items.find((currentItem) => currentItem.id === itemId);
      if (!item) {
        return;
      }

      setStatusChangeDialog({ item, action });
    },
    [items],
  );

  const handleStatusChangeConfirm = useCallback(
    async (data: StatusChangeData) => {
      if (!statusChangeDialog) {
        return;
      }

      try {
        await executeStatusChange(statusChangeDialog.item.id, data);
        await reloadItems();
        setStatusChangeDialog(null);
        const actionLabels: Record<string, string> = {
          pause: 'paused',
          resume: 'resumed',
          cancel: 'cancelled',
          reactivate: 'reactivated',
          convert: 'converted to paid',
          archive: 'archived',
          edit_cancellation: 'cancellation date updated',
          start_trial: 'moved to trial',
        };
        toast.success(`Item ${actionLabels[data.action] || 'updated'}`);
      } catch (error) {
        console.error('Failed to change status:', error);
        toast.error('Failed to change status. Please try again.');
      }
    },
    [reloadItems, statusChangeDialog],
  );

  const handleViewHistory = useCallback((item: ItemWithCategory) => {
    setHistoryDialogItem(item);
  }, []);

  const handleEdit = useCallback((item: ItemWithCategory) => {
    setEditingItem(item);
    setFormItemType(item.item_type);
    setShowForm(true);
  }, []);

  // Rendered in every branch so toasts survive sign-out (account deletion
  // success) and appear while signed out (auth deep-link callback errors).
  const toaster = (
    <Toaster
      position="bottom-right"
      theme={themeTone}
      toastOptions={{
        style: {
          borderRadius: '12px',
          fontSize: '14px',
        },
      }}
    />
  );

  if (authLoading) {
    return (
      <>
        <LoadingScreen />
        {toaster}
      </>
    );
  }

  if (!session) {
    return (
      <>
        <AuthScreen />
        {toaster}
      </>
    );
  }

  if (!isOnline) {
    return (
      <>
        <OfflineScreen />
        {toaster}
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <LoadingScreen />
        {toaster}
      </>
    );
  }

  return (
    <div className="app-layout h-screen flex">
      <div className="app-shell flex w-full h-screen">
        <AppSidebar
          view={view}
          onViewChange={handleViewChange}
          isCollapsed={isCollapsed}
          resolvedSidebarWidth={resolvedSidebarWidth}
          sidebarResizing={sidebarResizing}
          windowNarrow={windowNarrow}
          sidebarToggleTop={sidebarToggleTop}
          onToggleSidebarCollapsed={toggleSidebarCollapsed}
          onSidebarResizePointerDown={handleSidebarResizePointerDown}
          theme={theme}
          themeTone={themeTone}
          onToggleTheme={toggleTheme}
          updaterState={updaterState}
        />

        <AppContent
          session={session}
          emailBannerDismissed={emailBannerDismissed}
          onDismissEmailBanner={() => setEmailBannerDismissed(true)}
          view={view}
          isPending={isPending}
          items={items}
          categories={categories}
          onViewChange={handleViewChange}
          onEditItem={handleEdit}
          onDeleteItem={handleDeleteItem}
          onBulkDelete={handleBulkDelete}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkCategoryChange={handleBulkCategoryChange}
          onToggleActive={handleToggleActive}
          onStatusChange={handleStatusChange}
          onViewHistory={handleViewHistory}
          onAddNew={handleAddNew}
          onCategoriesChange={handleCategoriesChange}
          useVibrancy={useVibrancy}
          setUseVibrancy={setUseVibrancy}
          settingsTab={settingsTab}
          onSettingsTabChange={setSettingsTab}
          isModalOpen={Boolean(
            showForm ||
              statusChangeDialog ||
              historyDialogItem ||
              showPasswordRecovery,
          )}
        />
      </div>

      {toaster}

      {showForm && (
        <ItemForm
          item={editingItem}
          categories={categories}
          itemType={formItemType}
          isSaving={isSaving}
          onSave={
            editingItem
              ? (data) => handleUpdateItem(editingItem.id, data)
              : handleCreateItem
          }
          onClose={handleCloseForm}
        />
      )}

      {statusChangeDialog && (
        <StatusChangeDialog
          categories={categories}
          isOpen={true}
          item={statusChangeDialog.item}
          action={statusChangeDialog.action}
          onConfirm={handleStatusChangeConfirm}
          onCancel={handleStatusChangeCancel}
        />
      )}

      {historyDialogItem && (
        <StatusHistoryDialog
          isOpen={true}
          item={historyDialogItem}
          onClose={() => setHistoryDialogItem(null)}
        />
      )}

      {showPasswordRecovery && (
        <SetNewPassword
          onComplete={() => setShowPasswordRecovery(false)}
          onDismiss={() => setShowPasswordRecovery(false)}
        />
      )}
    </div>
  );
}

function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      {/*
        Above every animated surface (the selection HUD, the grid/table
        AnimatePresence transitions, dialogs). framer-motion drives its
        transitions as inline transform/opacity, which the
        `prefers-reduced-motion` blocks in index.css cannot reach — this is the
        only place that honours the OS setting for them.
      */}
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;
