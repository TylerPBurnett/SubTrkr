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
  PanelLeftClose,
  PanelLeftOpen,
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
import { onOpenUrl, getCurrent as getCurrentDeepLinks } from '@tauri-apps/plugin-deep-link';
import { toast, Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';
import ItemList from './components/ItemList';
import ItemForm from './components/ItemForm';
import AuthScreen from './components/AuthScreen';
import StatusChangeDialog from './components/StatusChangeDialog';
import SetNewPassword from './components/SetNewPassword';
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
  const [backgroundWarning, setBackgroundWarning] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formItemType, setFormItemType] = useState<ItemType>('subscription');
  const [editingItem, setEditingItem] = useState<ItemWithCategory | null>(null);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    item: ItemWithCategory;
    action: StatusChangeData['action'];
  } | null>(null);
  const [storedTheme, setStoredTheme] = useLocalStorage<string>('subtrkr-theme', DEFAULT_THEME);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>('subtrkr-sidebar-collapsed', false);
  const [windowNarrow, setWindowNarrow] = useState(() => window.innerWidth < 900);
  const isCollapsed = sidebarCollapsed || windowNarrow;
  const theme = isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  const themeTone = getThemeTone(theme);
  const [emailBannerDismissed, setEmailBannerDismissed] = useState(false);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const hasSeededCategories = useRef(false);
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Refs for keyboard shortcut handler — avoids re-registering listener on state changes (rule 5.6/8.2)
  const showFormRef = useRef(showForm);
  showFormRef.current = showForm;
  const statusChangeDialogRef = useRef(statusChangeDialog);
  statusChangeDialogRef.current = statusChangeDialog;

  const loadData = useCallback(async () => {
    try {
      const [itemsData, cats] = await Promise.all([getItems(), getCategories()]);
      setItems(itemsData);
      setCategories(cats);

      // Run maintenance and notifications in background (don't block UI)
      Promise.allSettled([
        advancePastDueItems(),
        archivePastCancellations(),
        resumePausedItems(),
        handleExpiredTrials(),
        checkAndNotifyUpcomingRenewals(itemsData),
        checkAndNotifyExpiringTrials(itemsData),
      ]).then((results) => {
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
          console.error('Some background tasks failed:', failures);
          setBackgroundWarning(`${failures.length} background task(s) failed. Data may be incomplete.`);
        }
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data. Please check your connection.');
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      // Handle password recovery flow
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle deep link auth callbacks (email verification, OAuth, password reset)
  useEffect(() => {
    async function handleDeepLink(urls: string[]) {
      for (const urlStr of urls) {
        try {
          if (!urlStr.startsWith('subtrkr://auth-callback')) {
            console.warn('Rejected deep link with invalid path:', urlStr);
            continue;
          }

          const url = new URL(urlStr);

          const error = url.searchParams.get('error');
          if (error) {
            const errorDesc = url.searchParams.get('error_description');
            toast.error(errorDesc || 'Authentication failed. Please try again.');
            return;
          }

          // PKCE flow (default in supabase-js v2.39+)
          const code = url.searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
            return;
          }
          // Implicit flow fallback (hash fragment tokens)
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        } catch (e) {
          console.error('Deep link auth error:', e);
          toast.error('Failed to complete sign-in. Please try again.');
        }
      }
    }

    // Check if app was launched via deep link
    getCurrentDeepLinks().then((urls) => {
      if (urls && urls.length > 0) handleDeepLink(urls);
    }).catch(() => {});

    // Listen for deep links while app is running
    let unlisten: (() => void) | undefined;
    onOpenUrl((urls) => handleDeepLink(urls)).then((fn) => { unlisten = fn; }).catch(() => {});

    return () => unlisten?.();
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

  // Auto-collapse sidebar on narrow windows (<900px)
  useEffect(() => {
    const handleResize = () => setWindowNarrow(window.innerWidth < 900);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
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

  // Route background warnings through Sonner toast
  useEffect(() => {
    if (backgroundWarning) {
      toast.warning(backgroundWarning);
      setBackgroundWarning(null);
    }
  }, [backgroundWarning]);

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

  // Global keyboard shortcuts — listener registered once per session (refs read latest state)
  useEffect(() => {
    if (!session) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape: close form or dialog
      if (e.key === 'Escape') {
        if (showFormRef.current) { handleCloseForm(); e.preventDefault(); return; }
        if (statusChangeDialogRef.current) { handleStatusChangeCancel(); e.preventDefault(); return; }
      }

      // Cmd/Ctrl+N: new subscription
      if (mod && e.key === 'n') {
        e.preventDefault();
        handleAddNew('subscription');
        return;
      }

      // Cmd/Ctrl+B: new bill (only if not in input to avoid bold conflict)
      if (mod && e.key === 'b' && !inInput) {
        e.preventDefault();
        handleAddNew('bill');
        return;
      }

      // Cmd/Ctrl+1-5: navigate views
      if (mod && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const views: View[] = ['dashboard', 'subscriptions', 'bills', 'analytics', 'settings'];
        const idx = parseInt(e.key) - 1;
        if (idx < views.length) startTransition(() => setView(views[idx]));
        return;
      }

      // Cmd/Ctrl+\: toggle sidebar (only when window isn't forcing collapse)
      if (mod && e.key === '\\') {
        e.preventDefault();
        if (!windowNarrow) setSidebarCollapsed((prev) => !prev);
        return;
      }

      // / : focus search (when not in an input)
      if (e.key === '/' && !inInput) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[type="text"][placeholder*="Search"]');
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session]); // refs read latest showForm/statusChangeDialog without re-subscribing

  const toggleTheme = () => {
    setStoredTheme((prev) => getNextTheme(isTheme(prev) ? prev : DEFAULT_THEME));
  };

  const handleCreateItem = async (data: Parameters<typeof createItem>[0]) => {
    setIsSaving(true);
    try {
      await createItem(data);
      setShowForm(false);
      toast.success('Item created');
    } catch (err) {
      console.error('Failed to create item:', err);
      toast.error('Failed to create item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async (id: string, data: Parameters<typeof updateItem>[1]) => {
    setIsSaving(true);
    try {
      await updateItem(id, data);
      setEditingItem(null);
      setShowForm(false);
      toast.success('Item updated');
    } catch (err) {
      console.error('Failed to update item:', err);
      toast.error('Failed to update item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItem(id);
      toast.success('Item deleted');
    } catch (err) {
      console.error('Failed to delete item:', err);
      toast.error('Failed to delete item. Please try again.');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await toggleItemActive(id);
    } catch (err) {
      console.error('Failed to update item:', err);
      toast.error('Failed to update item. Please try again.');
    }
  };

  const handleStatusChange = async (itemId: string, action: StatusChangeData['action']) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    setStatusChangeDialog({ item, action });
  };

  const handleStatusChangeConfirm = async (data: StatusChangeData) => {
    if (!statusChangeDialog) return;

    try {
      await executeStatusChange(statusChangeDialog.item.id, data);
      setStatusChangeDialog(null);
      const actionLabels: Record<string, string> = {
        pause: 'paused', resume: 'resumed', cancel: 'cancelled',
        reactivate: 'reactivated', convert: 'converted to paid',
      };
      toast.success(`Item ${actionLabels[data.action] || 'updated'}`);
    } catch (err) {
      console.error('Failed to change status:', err);
      toast.error('Failed to change status. Please try again.');
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
        <div className="flex flex-col items-center gap-4">
          <span
            className="text-2xl select-none"
            style={{ fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
          >
            Sub<span style={{ color: 'var(--brand-primary)' }}>Trkr</span>
          </span>
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }} />
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

  // Data loading state — show full app shell with skeleton content
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <span
            className="text-2xl select-none"
            style={{ fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
          >
            Sub<span style={{ color: 'var(--brand-primary)' }}>Trkr</span>
          </span>
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout h-screen flex" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="app-shell flex w-full h-screen">
        {/* Sidebar */}
        <aside
          className="sidebar shrink-0 h-full flex flex-col transition-all duration-200"
          style={{ width: isCollapsed ? '64px' : '256px' }}
        >
          {/* Draggable title bar area with branding */}
          <div
            data-tauri-drag-region
            className="h-12 shrink-0 flex items-center"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            {!isCollapsed && (
              <>
                {/* Traffic light reservation zone — macOS puts the buttons here (~76px) */}
                <div data-tauri-drag-region className="w-[76px] shrink-0 h-full" />
                {/* Brand centered in the remaining space */}
                <span
                  className="text-lg select-none flex-1 text-center"
                  style={{
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: 'var(--text-primary)',
                    WebkitAppRegion: 'drag',
                  } as React.CSSProperties}
                >
                  Sub<span style={{ color: 'var(--brand-primary)' }}>Trkr</span>
                </span>
                {/* Hide toggle when window forces collapse */}
                {!windowNarrow && (
                  <button
                    onClick={() => setSidebarCollapsed((prev) => !prev)}
                    className="p-1.5 rounded-lg transition-colors interactive-hover-bg shrink-0"
                    style={{
                      color: 'var(--text-muted)',
                      WebkitAppRegion: 'no-drag',
                      marginRight: '8px',
                    } as React.CSSProperties}
                    title="Collapse sidebar"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>

          <nav className={`flex-1 overflow-auto ${isCollapsed ? 'px-1.5' : 'px-3'}`}>
            {/* Expand button lives here when collapsed — clears the traffic light zone */}
            {isCollapsed && !windowNarrow && (
              <button
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="w-full flex items-center justify-center rounded-xl mb-1 py-3 transition-all duration-200 nav-item"
                style={{ borderLeft: '4px solid transparent' }}
                title="Expand sidebar"
              >
                <PanelLeftOpen className="w-5 h-5 shrink-0" />
              </button>
            )}
            {navItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => startTransition(() => setView(item.id))}
                title={isCollapsed ? item.label : undefined}
                className={`stagger-item w-full flex items-center rounded-xl mb-1 transition-all duration-200 ${
                  view === item.id ? 'nav-item-active font-medium' : 'nav-item'
                } ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'}`}
                style={{
                  animationDelay: `${index * 0.05}s`,
                  borderLeft: view === item.id ? '4px solid var(--brand-primary)' : '4px solid transparent',
                }}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && item.label}
              </button>
            ))}
          </nav>

          <div
            className={`flex items-center ${isCollapsed ? 'flex-col gap-2 p-2' : 'gap-2 p-4'}`}
            style={{ borderTop: '1px solid var(--shell-divider)' }}
          >
            {/* Theme Toggle Icon Button */}
            <button
              onClick={toggleTheme}
              title={`Theme: ${theme}`}
              aria-label={`Switch theme (current: ${theme})`}
              className={`flex items-center justify-center p-3 rounded-xl btn-secondary interactive-hover-bg ${isCollapsed ? 'w-full' : 'flex-1'}`}
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
              title={isCollapsed ? 'Settings' : undefined}
              className={`flex items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                view === 'settings' ? 'nav-item-active' : 'btn-secondary interactive-hover-bg'
              } ${isCollapsed ? 'w-full' : 'flex-1'}`}
              style={{
                color: view === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderLeft: view === 'settings' ? '4px solid var(--brand-primary)' : '4px solid transparent',
              }}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content flex-1 min-w-0 h-full flex flex-col">
          {/* Email verification banner */}
          {session?.user && !session.user.email_confirmed_at && !emailBannerDismissed && (
            <EmailVerificationBanner
              email={session.user.email || ''}
              onDismiss={() => setEmailBannerDismissed(true)}
            />
          )}

          <div className="flex-1 overflow-auto" style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          <div className="px-8 pb-8">
            {/* Header — also serves as drag region */}
            <div
              data-tauri-drag-region
              className="flex items-center justify-between pt-5 pb-6"
              style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
            <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <Plus className="w-5 h-5" />
                Add Bill
              </button>
            )}
            {view === 'subscriptions' && (
              <button
                onClick={() => handleAddNew('subscription')}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <Plus className="w-5 h-5" />
                Add Subscription
              </button>
            )}
          </div>

          {/* Content */}
          {view === 'dashboard' && (
            <Dashboard
              items={items}
              categories={categories}
              onEdit={handleEdit}
              onViewAll={() => startTransition(() => setView('subscriptions'))}
              onAddNew={() => handleAddNew('subscription')}
            />
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
            <ErrorBoundary>
              <Suspense fallback={<LazyComponentFallback />}>
                <Analytics items={items} categories={categories} />
              </Suspense>
            </ErrorBoundary>
          )}
          {view === 'settings' && (
            <ErrorBoundary>
              <Suspense fallback={<LazyComponentFallback />}>
                <Settings categories={categories} onCategoriesChange={loadData} />
              </Suspense>
            </ErrorBoundary>
          )}
          </div>
          </div>
        </main>
      </div>

      {/* Toast notifications */}
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

      {/* Password Recovery Modal */}
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
