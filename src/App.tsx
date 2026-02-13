import { useState, useEffect, useCallback, useRef, Suspense, lazy, useTransition } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Session } from '@supabase/supabase-js';
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  Moon,
  Sun,
  WifiOff,
} from 'lucide-react';
import type { ItemWithCategory, Category, ItemType, StatusChangeData } from './types';
import {
  getItems,
  getCategories,
  createItem,
  updateItem,
  deleteItem,
  toggleItemActive,
  advancePastDueItems,
  archivePastCancellations,
  resumePausedItems,
  handleExpiredTrials,
  executeStatusChange,
} from './services/database';
import { supabase } from './services/supabase';
import { seedDefaultCategoriesIfNeeded } from './services/seedCategories';
import { checkAndNotifyUpcomingRenewals, checkAndNotifyExpiringTrials } from './services/notifications';
import { checkForUpdatesOnLaunch } from './services/updater';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';
import ItemList from './components/ItemList';
import ItemForm from './components/ItemForm';
import AuthScreen from './components/AuthScreen';
import StatusChangeDialog from './components/StatusChangeDialog';
import { LazyComponentFallback } from './components/LazyComponentFallback';
import EmailVerificationBanner from './components/EmailVerificationBanner';
import { DEFAULT_THEME, getNextTheme, getThemeTone, isTheme } from './theme';

// Lazy load heavier components for code splitting
const Analytics = lazy(() => import('./components/Analytics'));
const Settings = lazy(() => import('./components/Settings'));

type View = 'dashboard' | 'bills' | 'subscriptions' | 'analytics' | 'settings';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [view, setView] = useState<View>('dashboard');
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formItemType, setFormItemType] = useState<ItemType>('subscription');
  const [editingItem, setEditingItem] = useState<ItemWithCategory | null>(null);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    item: ItemWithCategory;
    action: StatusChangeData['action'];
  } | null>(null);
  const [storedTheme, setStoredTheme] = useLocalStorage<string>('subtrkr-theme', DEFAULT_THEME);
  const theme = isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  const themeTone = getThemeTone(theme);
  const [emailBannerDismissed, setEmailBannerDismissed] = useState(false);
  const hasSeededCategories = useRef(false);
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Run background maintenance jobs
      await Promise.all([
        advancePastDueItems(),
        archivePastCancellations(),
        resumePausedItems(),
        handleExpiredTrials(),
      ]);

      const [itemsData, cats] = await Promise.all([getItems(), getCategories()]);
      setItems(itemsData);
      setCategories(cats);

      // Send notifications for upcoming renewals and expiring trials
      Promise.all([
        checkAndNotifyUpcomingRenewals(itemsData),
        checkAndNotifyExpiringTrials(itemsData),
      ]).catch((notifyError) => {
        console.warn('Failed to send notifications:', notifyError);
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load data. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced reload function to batch rapid changes
  const debouncedLoadData = useCallback(() => {
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
    }
    reloadTimerRef.current = setTimeout(() => {
      loadData();
    }, 100);
  }, [loadData]);

  // Check auth session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

  // Check for app updates after login on desktop builds.
  useEffect(() => {
    if (!session) return;

    checkForUpdatesOnLaunch().catch((updateError) => {
      console.warn('Automatic update check failed:', updateError);
    });
  }, [session]);

  // Seed default categories on first login
  useEffect(() => {
    if (session && !hasSeededCategories.current) {
      hasSeededCategories.current = true;
      seedDefaultCategoriesIfNeeded()
        .then(() => {
          // Refresh categories after seeding
          getCategories().then(setCategories);
        })
        .catch((error) => {
          console.error('Failed to seed categories:', error);
        });
    }
  }, [session]);

  // Real-time subscriptions
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => debouncedLoadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () =>
        debouncedLoadData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () =>
        debouncedLoadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
      }
    };
  }, [session, debouncedLoadData]);

  // Network connectivity check
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

  // Normalize corrupted/unknown theme values from localStorage
  useEffect(() => {
    if (!isTheme(storedTheme)) {
      setStoredTheme(DEFAULT_THEME);
    }
  }, [storedTheme, setStoredTheme]);

  // Theme switching via data-theme attribute
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', themeTone === 'dark');
  }, [theme, themeTone]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Daily background jobs (runs every 24 hours)
  useEffect(() => {
    if (!session) return;

    const runDailyJobs = async () => {
      try {
        const [archived, resumed, advanced] = await Promise.all([
          archivePastCancellations(),
          resumePausedItems(),
          advancePastDueItems(),
        ]);
        if (archived > 0 || resumed > 0 || advanced > 0) {
          console.log(`Daily jobs: ${archived} archived, ${resumed} resumed, ${advanced} advanced`);
          loadData(); // Reload data if any changes were made
        }
      } catch (error) {
        console.error('Daily jobs failed:', error);
      }
    };

    // Run once per day (86400000ms = 24 hours)
    const interval = setInterval(runDailyJobs, 86400000);

    return () => clearInterval(interval);
  }, [session, loadData]);

  const toggleTheme = () => {
    setStoredTheme((prev) => getNextTheme(isTheme(prev) ? prev : DEFAULT_THEME));
  };

  const handleCreateItem = async (data: Parameters<typeof createItem>[0]) => {
    setIsSaving(true);
    setError(null);
    try {
      await createItem(data);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create item:', err);
      setError('Failed to create item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async (id: string, data: Parameters<typeof updateItem>[1]) => {
    setIsSaving(true);
    setError(null);
    try {
      await updateItem(id, data);
      setEditingItem(null);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('Failed to update item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setError(null);
    try {
      await deleteItem(id);
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError('Failed to delete item. Please try again.');
    }
  };

  const handleToggleActive = async (id: string) => {
    setError(null);
    try {
      await toggleItemActive(id);
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('Failed to update item. Please try again.');
    }
  };

  const handleStatusChange = async (itemId: string, action: StatusChangeData['action']) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    setStatusChangeDialog({ item, action });
  };

  const handleStatusChangeConfirm = async (data: StatusChangeData) => {
    if (!statusChangeDialog) return;

    setError(null);
    try {
      await executeStatusChange(statusChangeDialog.item.id, data);
      setStatusChangeDialog(null);
    } catch (err) {
      console.error('Failed to change status:', err);
      setError('Failed to change status. Please try again.');
    }
  };

  const handleStatusChangeCancel = () => {
    setStatusChangeDialog(null);
  };

  const handleEdit = (item: ItemWithCategory) => {
    setEditingItem(item);
    setFormItemType(item.item_type);
    setShowForm(true);
  };

  const handleAddNew = (itemType: ItemType) => {
    setEditingItem(null);
    setFormItemType(itemType);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subscriptions' as const, label: 'Subscriptions', icon: CreditCard },
    { id: 'bills' as const, label: 'Bills', icon: Receipt },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  // Auth loading state
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full" style={{ backgroundColor: 'var(--brand-muted)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!session) {
    return <AuthScreen />;
  }

  // Show offline message
  if (!isOnline) {
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
          <WifiOff className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            No Internet Connection
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            SubTrkr requires an internet connection to work. Please check your network and try again.
          </p>
        </div>
      </div>
    );
  }

  // Data loading state
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full" style={{ backgroundColor: 'var(--brand-muted)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout h-screen flex" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="app-shell flex w-full h-screen">
        {/* Sidebar */}
        <aside className="sidebar w-64 shrink-0 h-full flex flex-col">
          {/* Draggable title bar area */}
          <div
            data-tauri-drag-region
            className="h-12 shrink-0"
            style={{
              WebkitAppRegion: 'drag'
            } as React.CSSProperties}
          />

          <nav className="flex-1 px-3 overflow-auto">
            {navItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => startTransition(() => setView(item.id))}
                className={`stagger-item w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 ${
                  view === item.id ? 'nav-item-active font-medium' : 'nav-item'
                }`}
                style={{
                  animationDelay: `${index * 0.05}s`,
                  borderLeft: view === item.id ? '4px solid var(--brand-primary)' : '4px solid transparent',
                  paddingLeft: view === item.id ? 'calc(1rem - 4px)' : '1rem'
                }}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 flex items-center gap-2" style={{ borderTop: '1px solid var(--shell-divider)' }}>
            {/* Theme Toggle Icon Button */}
            <button
              onClick={toggleTheme}
              title={`Theme: ${theme}`}
              aria-label={`Switch theme (current: ${theme})`}
              className="flex-1 flex items-center justify-center p-3 rounded-xl btn-secondary interactive-hover-bg"
            >
              <div style={{
                transition: 'transform 0.3s var(--ease-spring)',
                transform: themeTone === 'dark' ? 'rotate(0deg) scale(1)' : 'rotate(180deg) scale(1.1)'
              }}>
                {themeTone === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </div>
            </button>

            {/* Settings Icon Button */}
            <button
              onClick={() => startTransition(() => setView('settings'))}
              className={`flex-1 flex items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                view === 'settings' ? 'bg-brand-primary text-text-inverse' : 'interactive-hover'
              }`}
              style={{
                backgroundColor: view === 'settings' ? 'var(--brand-primary)' : 'var(--bg-hover)',
                color: view === 'settings' ? 'var(--text-inverse)' : 'var(--text-secondary)',
                borderLeft: view === 'settings' ? '4px solid var(--brand-primary)' : '4px solid transparent'
              }}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content flex-1 min-w-0 h-full flex flex-col">
          {/* Draggable title bar area for main content */}
          <div
            data-tauri-drag-region
            className="h-12 shrink-0"
            style={{
              WebkitAppRegion: 'drag'
            } as React.CSSProperties}
          />

          {/* Email verification banner */}
          {session?.user && !session.user.email_confirmed_at && !emailBannerDismissed && (
            <EmailVerificationBanner
              email={session.user.email || ''}
              onDismiss={() => setEmailBannerDismissed(true)}
            />
          )}

          <div className="flex-1 overflow-auto" style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl" style={{ color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {view === 'dashboard' && 'Dashboard'}
                {view === 'bills' && 'Bills'}
                {view === 'subscriptions' && 'Subscriptions'}
                {view === 'analytics' && 'Analytics'}
                {view === 'settings' && 'Settings'}
              </h2>
              <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                {view === 'dashboard' && 'Your spending overview at a glance'}
                {view === 'bills' && 'Manage your recurring bills and utilities'}
                {view === 'subscriptions' && 'Manage all your recurring subscriptions'}
                {view === 'analytics' && 'Spending insights and trends'}
                {view === 'settings' && 'Configure your preferences'}
              </p>
            </div>

            {view === 'bills' && (
              <button
                onClick={() => handleAddNew('bill')}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Add Bill
              </button>
            )}
            {view === 'subscriptions' && (
              <button
                onClick={() => handleAddNew('subscription')}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Add Subscription
              </button>
            )}
          </div>

          {/* Content */}
          {view === 'dashboard' && (
            <Dashboard items={items} categories={categories} onEdit={handleEdit} />
          )}
          {view === 'bills' && (
            <ItemList
              items={items}
              categories={categories}
              itemType="bill"
              onEdit={handleEdit}
              onDelete={handleDeleteItem}
              onToggleActive={handleToggleActive}
              onStatusChange={handleStatusChange}
              onAddNew={() => handleAddNew('bill')}
            />
          )}
          {view === 'subscriptions' && (
            <ItemList
              items={items}
              categories={categories}
              itemType="subscription"
              onEdit={handleEdit}
              onDelete={handleDeleteItem}
              onToggleActive={handleToggleActive}
              onStatusChange={handleStatusChange}
              onAddNew={() => handleAddNew('subscription')}
            />
          )}
          {view === 'analytics' && (
            <Suspense fallback={<LazyComponentFallback />}>
              <Analytics items={items} categories={categories} />
            </Suspense>
          )}
          {view === 'settings' && (
            <Suspense fallback={<LazyComponentFallback />}>
              <Settings categories={categories} onCategoriesChange={loadData} />
            </Suspense>
          )}
          </div>
          </div>
        </main>
      </div>

      {/* Error Toast */}
      {error && (
        <div
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg"
          style={{
            backgroundColor: 'var(--accent-red)',
            color: 'white',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-white/20 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Item Form Modal */}
      {showForm && (
        <ItemForm
          item={editingItem}
          categories={categories}
          itemType={formItemType}
          isSaving={isSaving}
          onSave={
            editingItem ? (data) => handleUpdateItem(editingItem.id, data) : handleCreateItem
          }
          onClose={handleCloseForm}
        />
      )}

      {/* Status Change Dialog */}
      {statusChangeDialog && (
        <StatusChangeDialog
          isOpen={true}
          item={statusChangeDialog.item}
          action={statusChangeDialog.action}
          onConfirm={handleStatusChangeConfirm}
          onCancel={handleStatusChangeCancel}
        />
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
