import { useState, useEffect, useMemo, memo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useItemFilters } from "@/hooks/useItemFilters";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  History,
  MoreVertical,
  Pencil,
  Trash2,
  Archive,
  Calendar,
  Clock3,
  Pause,
  Play,
  XCircle,
  RotateCcw,
  ExternalLink,
  CreditCard,
  Receipt,
  Check,
  Plus,
} from "lucide-react";
import SearchFilterToolbar from "./SearchFilterToolbar";
import { Checkbox } from "./ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type {
  ItemWithCategory,
  Category,
  BillingCycle,
  ItemType,
  StatusChangeData,
} from "@/types";
import ConfirmDialog from "./ui/ConfirmDialog";
import EmptyState from "./ui/EmptyState";
import ServiceLogo from "./ui/ServiceLogo";
import { formatDisplayDate, formatShortDate } from "../utils/dates";
import GhostListPreview from './ui/GhostListPreview';

interface ItemListProps {
  items: ItemWithCategory[];
  categories: Category[];
  itemType?: ItemType; // If provided, filters to this type
  onEdit: (item: ItemWithCategory) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void; // DEPRECATED: kept for compatibility
  onStatusChange?: (itemId: string, action: StatusChangeData["action"]) => void;
  onViewHistory?: (item: ItemWithCategory) => void;
  onAddNew?: () => void;
}

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

const billingCycleLabels: Record<BillingCycle, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

type SortBy = "next_billing_date" | "name" | "amount" | "category" | "status";
type SortDirection = "asc" | "desc";

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: "next_billing_date", label: "Next billing" },
  { value: "name", label: "Name" },
  { value: "amount", label: "Price" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
];

const sortCollator = new Intl.Collator("en-US", {
  sensitivity: "base",
  numeric: true,
});

const statusOrder: Record<ItemWithCategory["status"], number> = {
  active: 0,
  trial: 1,
  paused: 2,
  cancelled: 3,
  archived: 4,
};

function ItemList({
  items,
  categories,
  itemType,
  onEdit,
  onDelete,
  onToggleActive,
  onStatusChange,
  onViewHistory,
  onAddNew,
}: ItemListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showActives, setShowActives] = useState(true);
  const [showTrials, setShowTrials] = useState(true);
  const [showPaused, setShowPaused] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const viewStorageKey = `subtrkr-item-view-${itemType ?? "all"}`;
  const [viewMode, setViewMode] = useLocalStorage<"grid" | "list">(
    viewStorageKey,
    "grid",
  );
  const sortByStorageKey = `subtrkr-item-sort-by-${itemType ?? "all"}`;
  const sortDirectionStorageKey = `subtrkr-item-sort-direction-${itemType ?? "all"}`;
  const [sortBy, setSortBy] = useLocalStorage<SortBy>(
    sortByStorageKey,
    "next_billing_date",
  );
  const [sortDirection, setSortDirection] = useLocalStorage<SortDirection>(
    sortDirectionStorageKey,
    "asc",
  );
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (viewMode !== "grid" || selectedItemIds.size === 0) {
      return;
    }
    setSelectedItemIds(new Set());
  }, [viewMode, selectedItemIds.size]);

  // Get labels based on item type
  const labels = {
    singular: itemType === "bill" ? "bill" : "subscription",
    plural: itemType === "bill" ? "bills" : "subscriptions",
    icon: itemType === "bill" ? Receipt : CreditCard,
  };

  // Filter items using custom hook
  const {
    typeFilteredItems,
    filteredItems,
    activeFilterCount: hookActiveFilterCount,
  } = useItemFilters({
    items,
    itemType,
    searchQuery,
    selectedCategory,
    showActives,
    showTrials,
    showPaused,
    showCancelled,
  });

  // Filter categories by type
  const filteredCategories = itemType
    ? categories.filter((cat) => cat.category_type === itemType)
    : categories;

  const sortedItems = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;

    return [...filteredItems].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = sortCollator.compare(a.name, b.name);
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "category":
          comparison = sortCollator.compare(
            a.category?.name || "Uncategorized",
            b.category?.name || "Uncategorized",
          );
          break;
        case "status":
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case "next_billing_date":
        default:
          comparison = sortCollator.compare(
            a.next_billing_date,
            b.next_billing_date,
          );
          break;
      }

      if (comparison === 0) {
        comparison = sortCollator.compare(a.name, b.name);
      }

      return comparison * direction;
    });
  }, [filteredItems, sortBy, sortDirection]);

  useEffect(() => {
    if (selectedItemIds.size === 0) {
      return;
    }
    const visibleIds = new Set(sortedItems.map((item) => item.id));
    let changed = false;
    const next = new Set<string>();
    selectedItemIds.forEach((id) => {
      if (visibleIds.has(id)) {
        next.add(id);
      } else {
        changed = true;
      }
    });
    if (changed) {
      setSelectedItemIds(next);
    }
  }, [sortedItems, selectedItemIds]);

  const selectedVisibleItems = useMemo(() => {
    if (selectedItemIds.size === 0) {
      return [];
    }
    return sortedItems.filter((item) => selectedItemIds.has(item.id));
  }, [sortedItems, selectedItemIds]);

  const selectedCount = selectedVisibleItems.length;
  const allVisibleSelected =
    sortedItems.length > 0 && selectedCount === sortedItems.length;
  const someVisibleSelected =
    selectedCount > 0 && selectedCount < sortedItems.length;

  const handleDeleteClick = (item: ItemWithCategory) => {
    setDeleteConfirm({ id: item.id, name: item.name });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleSelectAllChange = (checked: boolean | "indeterminate") => {
    if (checked === true || checked === "indeterminate") {
      setSelectedItemIds(new Set(sortedItems.map((item) => item.id)));
      return;
    }
    setSelectedItemIds(new Set());
  };

  const handleSelectItemChange = (
    itemId: string,
    checked: boolean | "indeterminate",
  ) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (checked === true || checked === "indeterminate") {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedCount === 0) {
      setBulkDeleteConfirmOpen(false);
      return;
    }
    selectedVisibleItems.forEach((item) => {
      onDelete(item.id);
    });
    setSelectedItemIds(new Set());
    setBulkDeleteConfirmOpen(false);
  };

  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? "⌘" : "Ctrl+";

  const ShortcutHint = ({ keys }: { keys: string }) => (
    <span
      className="ml-auto text-[10px] font-mono opacity-50"
      style={{ color: "var(--text-muted)" }}
    >
      {keys}
    </span>
  );

  const renderActionsMenu = (item: ItemWithCategory) => (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(event) => event.stopPropagation()}
            className="p-2 rounded-lg transition-colors interactive-hover-bg !shadow-none outline-none"
            style={{ color: "var(--text-muted)", boxShadow: "none" }}
            aria-label="Actions"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-[200px]"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-strong)",
            boxShadow:
              "0 8px 32px -8px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--border-strong)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuItem
            onClick={() => onEdit(item)}
            className="gap-2.5 menu-item"
            style={{
              color: "var(--text-secondary)",
              letterSpacing: "-0.005em",
            }}
          >
            <Pencil className="w-4 h-4" />
            Edit
            <ShortcutHint keys={`${modKey}E`} />
          </DropdownMenuItem>

          {/* Status-aware actions */}
          {item.status === "trial" && onStatusChange && (
            <>
              <DropdownMenuItem
                onClick={() => onStatusChange(item.id, "convert")}
                className="gap-2.5 menu-item-success"
                style={{ letterSpacing: "-0.005em" }}
              >
                <Check className="w-4 h-4" />
                Convert to Paid
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(item.id, "cancel")}
                className="gap-2.5 menu-item"
                style={{
                  color: "var(--text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                <XCircle className="w-4 h-4" />
                Cancel Trial
              </DropdownMenuItem>
            </>
          )}

          {item.status === "active" && onStatusChange && (
            <>
              <DropdownMenuItem
                onClick={() => onStatusChange(item.id, "pause")}
                className="gap-2.5 menu-item"
                style={{
                  color: "var(--text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                <Pause className="w-4 h-4" />
                Pause
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(item.id, "cancel")}
                className="gap-2.5 menu-item"
                style={{
                  color: "var(--text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(item.id, "start_trial")}
                className="gap-2.5 menu-item"
                style={{
                  color: "var(--text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                <Clock3 className="w-4 h-4" />
                Start Trial
              </DropdownMenuItem>
            </>
          )}

          {item.status === "paused" && onStatusChange && (
            <>
              <DropdownMenuItem
                onClick={() => onStatusChange(item.id, "resume")}
                className="gap-2.5 menu-item"
                style={{
                  color: "var(--text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                <Play className="w-4 h-4" />
                Resume
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(item.id, "cancel")}
                className="gap-2.5 menu-item"
                style={{
                  color: "var(--text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </DropdownMenuItem>
            </>
          )}

          {item.status === "cancelled" && onStatusChange && (
            <>
              <DropdownMenuItem
                onClick={() => onStatusChange(item.id, "edit_cancellation")}
                className="gap-2.5 menu-item"
                style={{
                  color: "var(--text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                <Calendar className="w-4 h-4" />
                Edit Cancel Date
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(item.id, "reactivate")}
                className="gap-2.5 menu-item-success"
                style={{ letterSpacing: "-0.005em" }}
              >
                <RotateCcw className="w-4 h-4" />
                Reactivate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(item.id, "archive")}
                className="gap-2.5 menu-item"
                style={{
                  color: "var(--text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                <Archive className="w-4 h-4" />
                Archive
              </DropdownMenuItem>
            </>
          )}

          {item.status === "archived" && onStatusChange && (
            <DropdownMenuItem
              onClick={() => onStatusChange(item.id, "reactivate")}
              className="gap-2.5 menu-item-success"
              style={{ letterSpacing: "-0.005em" }}
            >
              <RotateCcw className="w-4 h-4" />
              Reactivate
            </DropdownMenuItem>
          )}

          {/* Fallback for old onToggleActive prop */}
          {!onStatusChange && (
            <DropdownMenuItem
              onClick={() => onToggleActive(item.id)}
              className="gap-2.5 menu-item"
              style={{
                color: "var(--text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              {item.is_active ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Resume
                </>
              )}
            </DropdownMenuItem>
          )}

          {item.url && (
            <DropdownMenuItem
              asChild
              className="gap-2.5 menu-item"
              style={{
                color: "var(--text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                Visit Website
              </a>
            </DropdownMenuItem>
          )}

          {onViewHistory && (
            <DropdownMenuItem
              onClick={() => onViewHistory(item)}
              className="gap-2.5 menu-item"
              style={{
                color: "var(--text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              <History className="w-4 h-4" />
              View History
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator
            style={{
              background: "var(--border-default)",
            }}
          />

          <DropdownMenuItem
            onClick={() => handleDeleteClick(item)}
            className="gap-2.5 menu-item-danger"
            style={{ letterSpacing: "-0.005em" }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
            <ShortcutHint keys={`${modKey}⌫`} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const renderStatusPill = (item: ItemWithCategory) => {
    const statusMeta = (() => {
      switch (item.status) {
        case "trial":
          return {
            label: "Trial",
            date: null,
            background: "var(--accent-blue-muted)",
            color: "var(--accent-blue)",
          };
        case "paused":
          return {
            label: "Paused",
            date: item.paused_until ? formatShortDate(item.paused_until) : null,
            background: "var(--accent-amber-muted)",
            color: "var(--accent-amber)",
          };
        case "cancelled":
          return {
            label: "Cancelled",
            date: item.cancellation_date
              ? formatShortDate(item.cancellation_date)
              : null,
            background: "var(--accent-red-muted)",
            color: "var(--accent-red)",
          };
        case "archived":
          return {
            label: "Archived",
            date: null,
            background: "var(--bg-hover)",
            color: "var(--text-muted)",
          };
        default:
          return {
            label: "Active",
            date: null,
            background: "var(--brand-primary-light)",
            color: "var(--brand-primary)",
          };
      }
    })();

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono"
        style={{
          backgroundColor: statusMeta.background,
          color: statusMeta.color,
          letterSpacing: "0.02em",
        }}
      >
        {statusMeta.label}
        {statusMeta.date ? (
          <span className="opacity-80">· {statusMeta.date}</span>
        ) : null}
      </span>
    );
  };

  const statusStyles = {
    active: "",
    trial: "",
    paused: "opacity-80",
    cancelled: "opacity-65",
    archived: "opacity-55",
  };

  const selectedLabel = selectedCount === 1 ? labels.singular : labels.plural;
  const Icon = labels.icon;
  const addButtonLabel =
    itemType === "bill"
      ? "Add Bill"
      : itemType === "subscription"
        ? "Add Subscription"
        : "Add Item";

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <SearchFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={`Search ${labels.plural}...`}
        categories={filteredCategories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        showActives={showActives}
        onShowActivesChange={setShowActives}
        showTrials={showTrials}
        onShowTrialsChange={setShowTrials}
        showPaused={showPaused}
        onShowPausedChange={setShowPaused}
        showCancelled={showCancelled}
        onShowCancelledChange={setShowCancelled}
        activeFilterCount={hookActiveFilterCount}
        onClearFilters={() => {
          setSelectedCategory("all");
          setShowActives(true);
          setShowTrials(true);
          setShowPaused(true);
          setShowCancelled(false);
        }}
        filterLabel={labels.plural}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortByChange={(value) => setSortBy(value as SortBy)}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
        sortOptions={SORT_OPTIONS}
      >
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onAddNew ? (
            <button
              type="button"
              onClick={onAddNew}
              className="btn-primary flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              {addButtonLabel}
            </button>
          ) : null}

          {/* Bulk actions - only shown in list mode when items are selected */}
          {viewMode === "list" && selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: "var(--bg-active)",
                  color: "var(--text-secondary)",
                }}
              >
                {selectedCount} selected
              </span>
              <button
                type="button"
                onClick={() => setBulkDeleteConfirmOpen(true)}
                className="flex items-center gap-2 h-9 px-3 rounded-lg border-2 text-xs font-semibold transition-colors interactive-hover-danger"
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--accent-red-muted)",
                  color: "var(--accent-red)",
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete selected
              </button>
            </div>
          )}
        </div>
      </SearchFilterToolbar>

      {/* Item List */}
      {typeFilteredItems.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Icon}
            title={`No ${labels.plural} yet`}
            description={`Start tracking your recurring payments by adding your first ${labels.singular}.`}
            action={
              onAddNew
                ? {
                    label: `Add ${labels.singular.charAt(0).toUpperCase() + labels.singular.slice(1)}`,
                    onClick: onAddNew,
                  }
                : undefined
            }
            preview={
              <GhostListPreview
                variant={viewMode === 'list' ? 'item-row' : 'item-card'}
                count={2}
              />
            }
          />
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Search}
            title="No matches found"
            description="Try adjusting your search or filter criteria."
          />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === "grid" ? (
            <motion.div
              key="grid"
              layout
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              {sortedItems.map((item, index) => {
                const categoryColor = item.category?.color || "#6b7280";

                return (
                  <motion.div
                    layout
                    key={item.id}
                    className={`stagger-item card group cursor-pointer ${statusStyles[item.status]}`}
                    style={{
                      filter:
                        item.status === "cancelled" ||
                        item.status === "archived"
                          ? "grayscale(0.15)"
                          : undefined,
                      animationDelay: `${index * 0.05}s`,
                      transition: "all 0.2s var(--ease-out-expo)",
                    }}
                    onClick={() => onEdit(item)}
                    onMouseEnter={(e) => {
                      if (item.status === "active") {
                        e.currentTarget.style.boxShadow = `0 8px 24px -8px ${categoryColor}40, var(--shadow-elevated)`;
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "var(--shadow-card)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      {/* Logo */}
                      <ServiceLogo
                        logoUrl={item.logo_url}
                        name={item.name}
                        size="md"
                        itemType={item.item_type}
                        categoryName={item.category?.name}
                        categoryColor={item.category?.color}
                      />

                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(item);
                          }}
                          className="block w-full text-left font-semibold text-lg truncate transition-colors hover:underline focus-visible:outline-none"
                          style={{
                            color: "var(--text-primary)",
                            letterSpacing: "-0.01em",
                          }}
                          aria-label={`Edit ${item.name}`}
                        >
                          {item.name}
                        </button>
                        <div
                          className="flex items-center gap-1.5 mt-0.5"
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.8125rem",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: categoryColor,
                              boxShadow: `0 0 0 2px ${categoryColor}20`,
                            }}
                          />
                          <span className="font-medium truncate">
                            {item.category?.name || "Uncategorized"}
                          </span>
                        </div>
                      </div>

                      {/* Menu */}
                      {renderActionsMenu(item)}
                    </div>

                    {/* Status badge (in flow) */}
                    {item.status !== "active" && (
                      <div className="mb-3">
                        {item.status === "trial" && (
                          <span
                            className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono"
                            style={{
                              background:
                                "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                              color: "white",
                              boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
                              letterSpacing: "0.02em",
                            }}
                          >
                            TRIAL
                          </span>
                        )}
                        {item.status === "paused" && (
                          <span
                            className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono"
                            style={{
                              background:
                                "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                              color: "white",
                              boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
                              letterSpacing: "0.02em",
                            }}
                          >
                            PAUSED{" "}
                            {item.paused_until &&
                              `· ${formatShortDate(item.paused_until)}`}
                          </span>
                        )}
                        {item.status === "cancelled" && (
                          <span
                            className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono"
                            style={{
                              background:
                                "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                              color: "white",
                              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
                              letterSpacing: "0.02em",
                            }}
                          >
                            CANCELLED{" "}
                            {item.cancellation_date &&
                              `· ${formatShortDate(item.cancellation_date)}`}
                          </span>
                        )}
                        {item.status === "archived" && (
                          <span
                            className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono"
                            style={{
                              backgroundColor: "var(--bg-hover)",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border-default)",
                              letterSpacing: "0.02em",
                            }}
                          >
                            ARCHIVED
                          </span>
                        )}
                      </div>
                    )}

                    {/* Amount */}
                    <div className="mb-4">
                      <p
                        className="font-mono font-semibold"
                        style={{
                          fontSize: "1.5rem",
                          letterSpacing: "-0.01em",
                          color: "var(--text-primary)",
                        }}
                      >
                        {formatCurrency(item.amount, item.currency)}
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {billingCycleLabels[item.billing_cycle]}
                      </p>
                    </div>

                    {/* Footer */}
                    <div
                      className="pt-4 flex items-center justify-between text-sm"
                      style={{ borderTop: "1px solid var(--border-muted)" }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>
                        Next billing
                      </span>
                      <span
                        className="font-mono font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatDisplayDate(item.next_billing_date)}
                      </span>
                    </div>
                    {item.status === "trial" && item.trial_end_date ? (
                      <p
                        className="mt-2 text-xs font-mono"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Trial ends {formatDisplayDate(item.trial_end_date)}
                      </p>
                    ) : null}
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: 760 }}>
                    <thead
                      style={{
                        backgroundColor: "var(--bg-default)",
                        borderBottom: "1px solid var(--border-default)",
                      }}
                    >
                      <tr>
                        <th className="pl-4 pr-2 py-3">
                          <Checkbox
                            checked={
                              allVisibleSelected
                                ? true
                                : someVisibleSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={handleSelectAllChange}
                            aria-label="Select all"
                            onClick={(event) => event.stopPropagation()}
                          />
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Company
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Renews
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Recurrence
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Cost
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Status
                        </th>
                        <th
                          className="px-4 py-3 text-right text-xs font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((item, index) => {
                        const categoryColor = item.category?.color || "#6b7280";

                        return (
                          <motion.tr
                            layout
                            key={item.id}
                            className={`stagger-item group cursor-pointer ${statusStyles[item.status]}`}
                            style={{
                              borderBottom: "1px solid var(--border-muted)",
                              filter:
                                item.status === "cancelled" ||
                                item.status === "archived"
                                  ? "grayscale(0.15)"
                                  : undefined,
                              animationDelay: `${index * 0.03}s`,
                              transition: "all 0.15s var(--ease-out-expo)",
                              position: "relative",
                            }}
                            onClick={() => onEdit(item)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "var(--bg-hover)";
                              if (item.status === "active") {
                                e.currentTarget.style.boxShadow = `inset 3px 0 0 ${categoryColor}`;
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <td
                              className="pl-5 pr-3 py-4"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Checkbox
                                checked={selectedItemIds.has(item.id)}
                                onCheckedChange={(checked) =>
                                  handleSelectItemChange(item.id, checked)
                                }
                                aria-label={`Select ${item.name}`}
                                onClick={(event) => event.stopPropagation()}
                              />
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3.5 min-w-[240px]">
                                <ServiceLogo
                                  logoUrl={item.logo_url}
                                  name={item.name}
                                  size="sm"
                                  itemType={item.item_type}
                                  categoryName={item.category?.name}
                                  categoryColor={item.category?.color}
                                />
                                <div className="min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onEdit(item);
                                    }}
                                    className="block w-full text-left font-semibold truncate transition-all focus-visible:outline-none group-hover:translate-x-0.5"
                                    style={{
                                      color: "var(--text-primary)",
                                      fontSize: "0.875rem",
                                      letterSpacing: "-0.01em",
                                    }}
                                    aria-label={`Edit ${item.name}`}
                                  >
                                    {item.name}
                                  </button>
                                  <div
                                    className="flex items-center gap-1.5 mt-0.5"
                                    style={{
                                      color: "var(--text-secondary)",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{
                                        backgroundColor: categoryColor,
                                        boxShadow: `0 0 0 2px ${categoryColor}20`,
                                      }}
                                    />
                                    <span className="font-medium">
                                      {item.category?.name || "Uncategorized"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td
                              className="px-5 py-4 font-mono font-medium"
                              style={{
                                color: "var(--text-primary)",
                                fontSize: "0.8125rem",
                                letterSpacing: "-0.01em",
                              }}
                            >
                              {formatDisplayDate(item.next_billing_date)}
                            </td>
                            <td
                              className="px-5 py-4 font-medium"
                              style={{
                                color: "var(--text-secondary)",
                                fontSize: "0.8125rem",
                              }}
                            >
                              {billingCycleLabels[item.billing_cycle]}
                            </td>
                            <td
                              className="px-5 py-4 font-mono font-bold"
                              style={{
                                color: "var(--text-primary)",
                                fontSize: "0.9375rem",
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {formatCurrency(item.amount, item.currency)}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col items-start gap-1">
                                {renderStatusPill(item)}
                                {item.status === "trial" &&
                                item.trial_end_date ? (
                                  <span
                                    className="text-[11px] font-mono"
                                    style={{ color: "var(--text-secondary)" }}
                                  >
                                    Ends {formatShortDate(item.trial_end_date)}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-right">
                              {renderActionsMenu(item)}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title={`Delete ${labels.singular.charAt(0).toUpperCase() + labels.singular.slice(1)}`}
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirmOpen && selectedCount > 0}
        title={`Delete ${selectedCount} ${selectedLabel}`}
        message={`Are you sure you want to delete ${selectedCount} ${selectedLabel}? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedCount}`}
        cancelLabel={selectedCount === 1 ? "Keep it" : "Keep them"}
        variant="danger"
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />
    </div>
  );
}

export default memo(ItemList);
