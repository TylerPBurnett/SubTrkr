import { useCallback, useEffect, useState, useSyncExternalStore, useTransition } from 'react';
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
  executeStatusChange,
  toggleItemActive,
  updateItem,
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
  const { items, categories, isLoading, handleCategoriesChange } =
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
    onCloseForm: handleCloseForm,
    onCancelStatusChange: handleStatusChangeCancel,
    onAddNew: handleAddNew,
    onNavigateView: handleViewChange,
    onToggleSidebar: toggleSidebarCollapsed,
  });

  const handleCreateItem = useCallback(
    async (data: Parameters<typeof createItem>[0]) => {
      setIsSaving(true);
      try {
        await createItem(data);
        setShowForm(false);
        toast.success('Item created');
      } catch (error) {
        console.error('Failed to create item:', error);
        toast.error('Failed to create item. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const handleUpdateItem = useCallback(
    async (id: string, data: Parameters<typeof updateItem>[1]) => {
      setIsSaving(true);
      try {
        await updateItem(id, data);
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
    [],
  );

  const handleDeleteItem = useCallback(async (id: string) => {
    try {
      await deleteItem(id);
      toast.success('Item deleted');
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to delete item. Please try again.');
    }
  }, []);

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
    [statusChangeDialog],
  );

  const handleViewHistory = useCallback((item: ItemWithCategory) => {
    setHistoryDialogItem(item);
  }, []);

  const handleEdit = useCallback((item: ItemWithCategory) => {
    setEditingItem(item);
    setFormItemType(item.item_type);
    setShowForm(true);
  }, []);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (!isOnline) {
    return <OfflineScreen />;
  }

  if (isLoading) {
    return <LoadingScreen />;
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
          onToggleActive={handleToggleActive}
          onStatusChange={handleStatusChange}
          onViewHistory={handleViewHistory}
          onAddNew={handleAddNew}
          onCategoriesChange={handleCategoriesChange}
          useVibrancy={useVibrancy}
          setUseVibrancy={setUseVibrancy}
          settingsTab={settingsTab}
          onSettingsTabChange={setSettingsTab}
        />
      </div>

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
        <SetNewPassword onComplete={() => setShowPasswordRecovery(false)} />
      )}
    </div>
  );
}

function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;
