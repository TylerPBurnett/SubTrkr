import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
  lazy,
  useTransition,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  WifiOff,
} from "lucide-react";
import type {
  ItemWithCategory,
  Category,
  ItemType,
  StatusChangeData,
} from "./types";
import {
  getItems,
  getCategories,
  createItem,
  updateItem,
  deleteItem,
  toggleItemActive,
  advancePastDueItems,
  resumePausedItems,
  handleExpiredTrials,
  executeStatusChange,
} from "./services/database";
import { supabase } from "./services/supabase";
import { seedDefaultCategoriesIfNeeded } from "./services/seedCategories";
import {
  checkAndNotifyUpcomingRenewals,
  checkAndNotifyExpiringTrials,
} from "./services/notifications";
import { checkForUpdatesOnLaunch } from "./services/updater";
import {
  onOpenUrl,
  getCurrent as getCurrentDeepLinks,
} from "@tauri-apps/plugin-deep-link";
import { toast, Toaster } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import Dashboard from "./components/Dashboard";
import ItemList from "./components/ItemList";
import ItemForm from "./components/ItemForm";
import AuthScreen from "./components/AuthScreen";
import StatusChangeDialog from "./components/StatusChangeDialog";
import StatusHistoryDialog from "./components/StatusHistoryDialog";
import SetNewPassword from "./components/SetNewPassword";
import { LazyComponentFallback } from "./components/LazyComponentFallback";
import EmailVerificationBanner from "./components/EmailVerificationBanner";
import TitleBar from "./components/TitleBar";
import { DEFAULT_THEME, getNextTheme, getThemeTone, isTheme } from "./theme";

// Lazy load heavier components for code splitting
const Analytics = lazy(() => import("./components/Analytics"));
const Settings = lazy(() => import("./components/Settings"));

type View = "dashboard" | "bills" | "subscriptions" | "analytics" | "settings";

const VIEW_CONTENT: Record<
  View,
  { label: string; title: string; description: string }
> = {
  dashboard: {
    label: "Overview",
    title: "Dashboard",
    description: "Your spending overview at a glance",
  },
  bills: {
    label: "Utilities",
    title: "Bills",
    description: "Manage your recurring bills and utilities",
  },
  subscriptions: {
    label: "Services",
    title: "Subscriptions",
    description: "Manage all your recurring subscriptions",
  },
  analytics: {
    label: "Insights",
    title: "Analytics",
    description: "Spending insights and trends",
  },
  settings: {
    label: "Preferences",
    title: "Settings",
    description: "Configure your preferences",
  },
};

const SIDEBAR_COLLAPSED_WIDTH = 64;
const SIDEBAR_MAC_COLLAPSED_WIDTH = 76;
const SIDEBAR_DEFAULT_WIDTH = 256;
const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_AUTO_COLLAPSE_BREAKPOINT = 900;
const SIDEBAR_SEAM_TOGGLE_TOP = 56;
const SIDEBAR_MAC_SEAM_TOGGLE_TOP = 84;

function clampSidebarWidth(width: number) {
  const safeWidth = Number.isFinite(width) ? width : SIDEBAR_DEFAULT_WIDTH;

  return Math.min(
    SIDEBAR_MAX_WIDTH,
    Math.max(SIDEBAR_MIN_WIDTH, Math.round(safeWidth)),
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [view, setView] = useState<View>("dashboard");
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [backgroundWarning, setBackgroundWarning] = useState<string | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);
  const [formItemType, setFormItemType] = useState<ItemType>("subscription");
  const [editingItem, setEditingItem] = useState<ItemWithCategory | null>(null);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    item: ItemWithCategory;
    action: StatusChangeData["action"];
  } | null>(null);
  const [historyDialogItem, setHistoryDialogItem] =
    useState<ItemWithCategory | null>(null);
  const [storedTheme, setStoredTheme] = useLocalStorage<string>(
    "subtrkr-theme",
    DEFAULT_THEME,
  );
  const [useVibrancy, setUseVibrancy] = useLocalStorage<boolean>(
    "subtrkr-vibrancy",
    true,
  );

  // Sync vibrancy preference to <html> for CSS selectors that need to reach body
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-vibrancy",
      useVibrancy ? "true" : "false",
    );
  }, [useVibrancy]);

  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>(
    "subtrkr-sidebar-collapsed",
    false,
  );
  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>(
    "subtrkr-sidebar-width",
    SIDEBAR_DEFAULT_WIDTH,
  );
  const [sidebarResizing, setSidebarResizing] = useState(false);
  const [windowNarrow, setWindowNarrow] = useState(
    () => window.innerWidth < SIDEBAR_AUTO_COLLAPSE_BREAKPOINT,
  );
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const isCollapsed = sidebarCollapsed || windowNarrow;
  const collapsedSidebarWidth = isMac
    ? SIDEBAR_MAC_COLLAPSED_WIDTH
    : SIDEBAR_COLLAPSED_WIDTH;
  const sidebarToggleTop = isMac
    ? SIDEBAR_MAC_SEAM_TOGGLE_TOP
    : SIDEBAR_SEAM_TOGGLE_TOP;
  const resolvedSidebarWidth = isCollapsed
    ? collapsedSidebarWidth
    : clampSidebarWidth(sidebarWidth);
  const theme = isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  const themeTone = getThemeTone(theme);
  const viewContent = VIEW_CONTENT[view];
  const [emailBannerDismissed, setEmailBannerDismissed] = useState(false);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const hasSeededCategories = useRef(false);
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Refs for keyboard shortcut handler — avoids re-registering listener on state changes (rule 5.6/8.2)
  const showFormRef = useRef(showForm);
  showFormRef.current = showForm;
  const statusChangeDialogRef = useRef(statusChangeDialog);
  statusChangeDialogRef.current = statusChangeDialog;
  const sidebarResizeStartXRef = useRef(0);
  const sidebarResizeStartWidthRef = useRef(clampSidebarWidth(sidebarWidth));

  const loadData = useCallback(async () => {
    try {
      const [itemsData, cats] = await Promise.all([
        getItems(),
        getCategories(),
      ]);
      setItems(itemsData);
      setCategories(cats);

      // Run maintenance and notifications in background (don't block UI)
      Promise.allSettled([
        advancePastDueItems(),
        resumePausedItems(),
        handleExpiredTrials(),
        checkAndNotifyUpcomingRenewals(itemsData),
        checkAndNotifyExpiringTrials(itemsData),
      ]).then((results) => {
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          console.error("Some background tasks failed:", failures);
          setBackgroundWarning(
            `${failures.length} background task(s) failed. Data may be incomplete.`,
          );
        }
      });
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load data. Please check your connection.");
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
      if (event === "PASSWORD_RECOVERY") {
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
          if (!urlStr.startsWith("subtrkr://auth-callback")) {
            console.warn("Rejected deep link with invalid path:", urlStr);
            continue;
          }

          const url = new URL(urlStr);

          const error = url.searchParams.get("error");
          if (error) {
            const errorDesc = url.searchParams.get("error_description");
            toast.error(
              errorDesc || "Authentication failed. Please try again.",
            );
            return;
          }

          // PKCE flow (default in supabase-js v2.39+)
          const code = url.searchParams.get("code");
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
            return;
          }
          // Implicit flow fallback (hash fragment tokens)
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const access_token = hashParams.get("access_token");
          const refresh_token = hashParams.get("refresh_token");
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        } catch (e) {
          console.error("Deep link auth error:", e);
          toast.error("Failed to complete sign-in. Please try again.");
        }
      }
    }

    // Check if app was launched via deep link
    getCurrentDeepLinks()
      .then((urls) => {
        if (urls && urls.length > 0) handleDeepLink(urls);
      })
      .catch(() => {});

    // Listen for deep links while app is running
    let unlisten: (() => void) | undefined;
    onOpenUrl((urls) => handleDeepLink(urls))
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

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
      console.warn("Automatic update check failed:", updateError);
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
          console.error("Failed to seed categories:", error);
        });
    }
  }, [session]);

  // Real-time subscriptions
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        () => debouncedLoadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => debouncedLoadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => debouncedLoadData(),
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
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-collapse sidebar on narrow windows
  useEffect(() => {
    const handleResize = () =>
      setWindowNarrow(window.innerWidth < SIDEBAR_AUTO_COLLAPSE_BREAKPOINT);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Normalize corrupted sidebar widths from localStorage
  useEffect(() => {
    const clampedWidth = clampSidebarWidth(sidebarWidth);
    if (sidebarWidth !== clampedWidth) {
      setSidebarWidth(clampedWidth);
    }
  }, [sidebarWidth, setSidebarWidth]);

  useEffect(() => {
    if (!sidebarResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = clampSidebarWidth(
        sidebarResizeStartWidthRef.current +
          (event.clientX - sidebarResizeStartXRef.current),
      );

      setSidebarWidth((current) =>
        current === nextWidth ? current : nextWidth,
      );
    };

    const stopResizing = () => setSidebarResizing(false);

    document.body.classList.add("sidebar-resizing");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
    window.addEventListener("blur", stopResizing);

    return () => {
      document.body.classList.remove("sidebar-resizing");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
      window.removeEventListener("blur", stopResizing);
    };
  }, [sidebarResizing, setSidebarWidth]);

  useEffect(() => {
    if (windowNarrow && sidebarResizing) {
      setSidebarResizing(false);
    }
  }, [windowNarrow, sidebarResizing]);

  // Normalize corrupted/unknown theme values from localStorage
  useEffect(() => {
    if (!isTheme(storedTheme)) {
      setStoredTheme(DEFAULT_THEME);
    }
  }, [storedTheme, setStoredTheme]);

  // Theme switching via data-theme attribute
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", themeTone === "dark");
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
        const [resumed, advanced] = await Promise.all([
          resumePausedItems(),
          advancePastDueItems(),
        ]);
        if (resumed > 0 || advanced > 0) {
          console.log(`Daily jobs: ${resumed} resumed, ${advanced} advanced`);
          loadData(); // Reload data if any changes were made
        }
      } catch (error) {
        console.error("Daily jobs failed:", error);
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
      const inInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Escape: close form or dialog
      if (e.key === "Escape") {
        if (showFormRef.current) {
          handleCloseForm();
          e.preventDefault();
          return;
        }
        if (statusChangeDialogRef.current) {
          handleStatusChangeCancel();
          e.preventDefault();
          return;
        }
      }

      // Cmd/Ctrl+N: new subscription
      if (mod && e.key === "n") {
        e.preventDefault();
        handleAddNew("subscription");
        return;
      }

      // Cmd/Ctrl+B: new bill (only if not in input to avoid bold conflict)
      if (mod && e.key === "b" && !inInput) {
        e.preventDefault();
        handleAddNew("bill");
        return;
      }

      // Cmd/Ctrl+1-5: navigate views
      if (mod && e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        const views: View[] = [
          "dashboard",
          "subscriptions",
          "bills",
          "analytics",
          "settings",
        ];
        const idx = parseInt(e.key) - 1;
        if (idx < views.length) startTransition(() => setView(views[idx]));
        return;
      }

      // Cmd/Ctrl+\: toggle sidebar (only when window isn't forcing collapse)
      if (mod && e.key === "\\") {
        e.preventDefault();
        if (!windowNarrow) setSidebarCollapsed((prev) => !prev);
        return;
      }

      // / : focus search (when not in an input)
      if (e.key === "/" && !inInput) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="text"][placeholder*="Search"]',
        );
        searchInput?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [session]); // refs read latest showForm/statusChangeDialog without re-subscribing

  const toggleTheme = () => {
    setStoredTheme((prev) =>
      getNextTheme(isTheme(prev) ? prev : DEFAULT_THEME),
    );
  };

  const handleSidebarResizePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (windowNarrow || isCollapsed) return;

    event.preventDefault();
    event.stopPropagation();
    sidebarResizeStartXRef.current = event.clientX;
    sidebarResizeStartWidthRef.current = clampSidebarWidth(sidebarWidth);
    setSidebarResizing(true);
  };

  const handleCreateItem = async (data: Parameters<typeof createItem>[0]) => {
    setIsSaving(true);
    try {
      await createItem(data);
      setShowForm(false);
      toast.success("Item created");
    } catch (err) {
      console.error("Failed to create item:", err);
      toast.error("Failed to create item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async (
    id: string,
    data: Parameters<typeof updateItem>[1],
  ) => {
    setIsSaving(true);
    try {
      await updateItem(id, data);
      setEditingItem(null);
      setShowForm(false);
      toast.success("Item updated");
    } catch (err) {
      console.error("Failed to update item:", err);
      toast.error("Failed to update item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItem(id);
      toast.success("Item deleted");
    } catch (err) {
      console.error("Failed to delete item:", err);
      toast.error("Failed to delete item. Please try again.");
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await toggleItemActive(id);
    } catch (err) {
      console.error("Failed to update item:", err);
      toast.error("Failed to update item. Please try again.");
    }
  };

  const handleStatusChange = async (
    itemId: string,
    action: StatusChangeData["action"],
  ) => {
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
        pause: "paused",
        resume: "resumed",
        cancel: "cancelled",
        reactivate: "reactivated",
        convert: "converted to paid",
        archive: "archived",
        edit_cancellation: "cancellation date updated",
        start_trial: "moved to trial",
      };
      toast.success(`Item ${actionLabels[data.action] || "updated"}`);
    } catch (err) {
      console.error("Failed to change status:", err);
      toast.error("Failed to change status. Please try again.");
    }
  };

  const handleStatusChangeCancel = () => {
    setStatusChangeDialog(null);
  };

  const handleViewHistory = (item: ItemWithCategory) => {
    setHistoryDialogItem(item);
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
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "subscriptions" as const, label: "Subscriptions", icon: CreditCard },
    { id: "bills" as const, label: "Bills", icon: Receipt },
    { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
  ];

  // Auth loading state
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <span
            className="text-2xl select-none"
            style={{
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
            }}
          >
            Sub<span style={{ color: "var(--brand-primary)" }}>Trkr</span>
          </span>
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: "var(--brand-primary)",
              borderTopColor: "transparent",
            }}
          />
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
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        <div
          className="max-w-md w-full card p-8 text-center"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <WifiOff
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: "var(--text-muted)" }}
          />
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            No Internet Connection
          </h2>
          <p style={{ color: "var(--text-secondary)" }}>
            SubTrkr requires an internet connection to work. Please check your
            network and try again.
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
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <span
            className="text-2xl select-none"
            style={{
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
            }}
          >
            Sub<span style={{ color: "var(--brand-primary)" }}>Trkr</span>
          </span>
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: "var(--brand-primary)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout h-screen flex">
      <div className="app-shell flex w-full h-screen">
        {/* Sidebar */}
        <aside
          className="sidebar relative shrink-0 h-full flex flex-col transition-all duration-200"
          style={{
            width: `${resolvedSidebarWidth}px`,
            transition: sidebarResizing ? "none" : undefined,
          }}
        >
          {/* Draggable title bar area */}
          <div
            data-tauri-drag-region
            className="h-12 shrink-0"
            style={{ WebkitAppRegion: "drag" } as CSSProperties}
          />

          <nav
            className={`flex-1 overflow-auto flex flex-col ${isCollapsed ? "px-2 mt-2" : "px-3 mt-2"}`}
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => startTransition(() => setView(item.id))}
                  title={isCollapsed ? item.label : undefined}
                  className={`stagger-item w-full flex items-center rounded-lg transition-all duration-200 ${
                    view === item.id ? "nav-item-active" : "nav-item"
                  } ${isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"}`}
                  style={{
                    animationDelay: `${index * 0.05}s`,
                  }}
                >
                  <item.icon
                    className="w-[18px] h-[18px] shrink-0"
                    style={{ opacity: view === item.id ? 1 : 0.7 }}
                  />
                  {!isCollapsed && item.label}
                </button>
              ))}
            </div>

            {/* Bottom actions (pushed down by mt-auto) */}
            <div className="mt-auto pb-4 pt-4 flex flex-col gap-1">
              <button
                onClick={toggleTheme}
                title={`Theme: ${theme}`}
                aria-label={`Switch theme (current: ${theme})`}
                className={`w-full flex items-center rounded-lg transition-all duration-200 nav-item ${isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"}`}
              >
                <div
                  style={{
                    transition: "transform 0.3s var(--ease-spring)",
                    transform:
                      themeTone === "dark"
                        ? "rotate(0deg) scale(1)"
                        : "rotate(180deg) scale(1.1)",
                  }}
                >
                  {themeTone === "dark" ? (
                    <Sun className="w-[18px] h-[18px] opacity-70" />
                  ) : (
                    <Moon className="w-[18px] h-[18px] opacity-70" />
                  )}
                </div>
                {!isCollapsed && (
                  <span className="flex-1 text-left">Theme</span>
                )}
              </button>

              <button
                onClick={() => startTransition(() => setView("settings"))}
                title={isCollapsed ? "Settings" : undefined}
                className={`w-full flex items-center rounded-lg transition-all duration-200 ${
                  view === "settings" ? "nav-item-active" : "nav-item"
                } ${isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"}`}
              >
                <SettingsIcon
                  className="w-[18px] h-[18px] shrink-0"
                  style={{ opacity: view === "settings" ? 1 : 0.7 }}
                />
                {!isCollapsed && (
                  <span className="flex-1 text-left">Settings</span>
                )}
              </button>
            </div>
          </nav>

          {!windowNarrow && (
            <button
              type="button"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="sidebar-seam-toggle"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              style={
                {
                  top: `${sidebarToggleTop}px`,
                  WebkitAppRegion: "no-drag",
                } as CSSProperties
              }
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
              className={`sidebar-resize-handle ${sidebarResizing ? "is-active" : ""}`}
              onPointerDown={handleSidebarResizePointerDown}
              style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
              title="Resize sidebar"
            />
          )}
        </aside>

        {/* Main Content */}
        <main className="main-content flex-1 min-w-0 h-full flex flex-col">
          <TitleBar />

          {/* Email verification banner */}
          {session?.user &&
            !session.user.email_confirmed_at &&
            !emailBannerDismissed && (
              <EmailVerificationBanner
                email={session.user.email || ""}
                onDismiss={() => setEmailBannerDismissed(true)}
              />
            )}

          <div
            className="page-scroll flex-1 overflow-auto relative"
            style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 0.2s" }}
          >
            <header className="page-header">
              <div className="page-header-copy">
                <p className="page-header-label">{viewContent.label}</p>
                <h2 className="page-header-title">{viewContent.title}</h2>
                <p className="page-header-description">
                  {viewContent.description}
                </p>
              </div>
            </header>

            <div className="page-body">
              {/* Content */}
              {view === "dashboard" && (
                <Dashboard
                  items={items}
                  categories={categories}
                  onEdit={handleEdit}
                  onViewAll={() =>
                    startTransition(() => setView("subscriptions"))
                  }
                  onAddNew={() => handleAddNew("subscription")}
                />
              )}
              {view === "bills" && (
                <ItemList
                  items={items}
                  categories={categories}
                  itemType="bill"
                  onEdit={handleEdit}
                  onDelete={handleDeleteItem}
                  onToggleActive={handleToggleActive}
                  onStatusChange={handleStatusChange}
                  onViewHistory={handleViewHistory}
                  onAddNew={() => handleAddNew("bill")}
                />
              )}
              {view === "subscriptions" && (
                <ItemList
                  items={items}
                  categories={categories}
                  itemType="subscription"
                  onEdit={handleEdit}
                  onDelete={handleDeleteItem}
                  onToggleActive={handleToggleActive}
                  onStatusChange={handleStatusChange}
                  onViewHistory={handleViewHistory}
                  onAddNew={() => handleAddNew("subscription")}
                />
              )}
              {view === "analytics" && (
                <ErrorBoundary>
                  <Suspense fallback={<LazyComponentFallback />}>
                    <Analytics items={items} categories={categories} />
                  </Suspense>
                </ErrorBoundary>
              )}
              {view === "settings" && (
                <ErrorBoundary>
                  <Suspense fallback={<LazyComponentFallback />}>
                    <Settings
                      categories={categories}
                      onCategoriesChange={loadData}
                      useVibrancy={useVibrancy}
                      setUseVibrancy={setUseVibrancy}
                    />
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
            borderRadius: "12px",
            fontSize: "14px",
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
            editingItem
              ? (data) => handleUpdateItem(editingItem.id, data)
              : handleCreateItem
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

      {historyDialogItem && (
        <StatusHistoryDialog
          isOpen={true}
          item={historyDialogItem}
          onClose={() => setHistoryDialogItem(null)}
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
