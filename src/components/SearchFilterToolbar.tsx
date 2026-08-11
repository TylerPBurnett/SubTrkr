import {
  Search,
  Filter,
  X,
  LayoutGrid,
  List,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FILTER_POPOVER_CLASS,
  FILTER_POPOVER_SURFACE,
  FilterActionRow,
  FilterCheckRow,
  FilterCountBadge,
  FilterRadioRow,
  FilterScrollArea,
  FilterSection,
} from "@/components/ui/FilterMenu";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { UNCATEGORIZED_FILTER_ID } from "@/utils/categories";
import {
  allCategoriesState,
  everySelectableCategoryId,
  isCategorySelected,
  onlyCategory,
  toggleAllCategories,
  toggleCategory,
} from "@/utils/categorySelection";
import type { Category } from "@/types";

const SORT_DIRECTION_TABS: Array<{ id: "asc" | "desc"; label: string }> = [
  { id: "asc", label: "Ascending" },
  { id: "desc", label: "Descending" },
];

interface SearchFilterToolbarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;

  // Category filter — null means no category filter at all
  categories: Category[];
  selectedCategoryIds: string[] | null;
  onCategoryIdsChange: (categoryIds: string[] | null) => void;

  // Status filters
  showActives: boolean;
  onShowActivesChange: (show: boolean) => void;
  showTrials: boolean;
  onShowTrialsChange: (show: boolean) => void;
  showPaused: boolean;
  onShowPausedChange: (show: boolean) => void;
  showCancelled: boolean;
  onShowCancelledChange: (show: boolean) => void;

  // Active filter count (for badge)
  activeFilterCount: number;
  onClearFilters: () => void;
  filterLabel?: string;

  // View mode
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;

  // Sort controls
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  sortDirection: "asc" | "desc";
  onSortDirectionChange: (direction: "asc" | "desc") => void;
  sortOptions: Array<{
    value: string;
    label: string;
  }>;

  // Extensibility
  children?: React.ReactNode;
}

export default function SearchFilterToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  categories,
  selectedCategoryIds,
  onCategoryIdsChange,
  showActives,
  onShowActivesChange,
  showTrials,
  onShowTrialsChange,
  showPaused,
  onShowPausedChange,
  showCancelled,
  onShowCancelledChange,
  activeFilterCount,
  onClearFilters,
  filterLabel = "items",
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  sortOptions,
  children,
}: SearchFilterToolbarProps) {
  const selectedSortLabel =
    sortOptions.find((option) => option.value === sortBy)?.label || "Default";

  // Selection semantics live in `utils/categorySelection` so this toolbar and
  // the calendar's filter cannot drift apart on what "all", "none", and
  // "only" mean — they were written twice before, and the collapse-to-null
  // rule is subtle enough that two copies is two chances to get it wrong.
  const everyCategoryId = everySelectableCategoryId(categories);
  const allState = allCategoriesState(selectedCategoryIds, everyCategoryId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Unified Search + Filter + View Toggle Container */}
      <div
        className="search-shell flex flex-1 min-w-0 items-center h-9 rounded-lg border-2 overflow-hidden transition-all duration-200"
        style={{
          backgroundColor: "var(--bg-input)",
        }}
      >
        {/* Search Icon */}
        <div className="flex items-center justify-center pl-3">
          <Search className="size-4" style={{ color: "var(--text-muted)" }} />
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 h-full px-2.5 text-sm font-medium bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none"
          style={{
            fontWeight: 500,
            color: "var(--text-primary)",
            boxShadow: "none",
          }}
        />

        {/* Clear Search Button */}
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="flex items-center justify-center px-2 h-full transition-colors focus:outline-none focus-visible:outline-none"
            style={{ color: "var(--text-muted)", boxShadow: "none" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            <X className="size-3.5" />
          </button>
        )}

        {/* Vertical Divider */}
        <div
          className="h-5 w-px shrink-0"
          style={{ backgroundColor: "var(--border-default)" }}
        />

        {/* Filter Trigger Button */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label={
                activeFilterCount > 0
                  ? `Filter ${filterLabel} — ${activeFilterCount} active`
                  : `Filter ${filterLabel}`
              }
              className="flex items-center justify-center gap-1 px-3 h-full transition-colors focus:outline-none focus-visible:outline-none"
              style={{
                // An active filter has to be visible from outside the
                // popover, or narrowed results read as missing data.
                color:
                  activeFilterCount > 0
                    ? "var(--brand-text)"
                    : "var(--text-secondary)",
                backgroundColor:
                  activeFilterCount > 0
                    ? "var(--brand-primary-light)"
                    : "transparent",
                boxShadow: "none",
              }}
              onMouseEnter={(e) => {
                if (activeFilterCount === 0) {
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeFilterCount === 0) {
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <Filter className="size-4" />
              <FilterCountBadge count={activeFilterCount} />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="center"
            className={FILTER_POPOVER_CLASS}
            style={FILTER_POPOVER_SURFACE}
          >
            {/*
              No title bar and no section labels. The trigger is a filter icon,
              so a heading reading "Filter subscriptions" tells you only what
              you just clicked, and a group that leads with its own "All …"
              row already names itself. Hairlines carry the structure — the
              same chrome the calendar's filter uses, so the two read as one
              control that appears in two places rather than two controls.
            */}
            <FilterSection label="Categories" divider={false}>
              <FilterCheckRow
                label="All Categories"
                checked={allState === "all"}
                indeterminate={allState === "partial"}
                onToggle={() =>
                  onCategoryIdsChange(
                    toggleAllCategories(selectedCategoryIds, everyCategoryId),
                  )
                }
              />
              <FilterScrollArea>
                {categories.map((cat) => (
                  <FilterCheckRow
                    key={cat.id}
                    label={cat.name}
                    swatch={cat.color}
                    checked={isCategorySelected(selectedCategoryIds, cat.id)}
                    onToggle={() =>
                      onCategoryIdsChange(
                        toggleCategory(selectedCategoryIds, cat.id, everyCategoryId),
                      )
                    }
                    onOnly={() =>
                      onCategoryIdsChange(onlyCategory(cat.id, everyCategoryId))
                    }
                  />
                ))}
                <FilterCheckRow
                  label="Uncategorized"
                  checked={isCategorySelected(
                    selectedCategoryIds,
                    UNCATEGORIZED_FILTER_ID,
                  )}
                  onToggle={() =>
                    onCategoryIdsChange(
                      toggleCategory(
                        selectedCategoryIds,
                        UNCATEGORIZED_FILTER_ID,
                        everyCategoryId,
                      ),
                    )
                  }
                  onOnly={() =>
                    onCategoryIdsChange(
                      onlyCategory(UNCATEGORIZED_FILTER_ID, everyCategoryId),
                    )
                  }
                />
              </FilterScrollArea>
            </FilterSection>

            <FilterSection label="Visibility">
              <FilterCheckRow
                label="Show actives"
                checked={showActives}
                onToggle={() => onShowActivesChange(!showActives)}
              />
              <FilterCheckRow
                label="Show trials"
                checked={showTrials}
                onToggle={() => onShowTrialsChange(!showTrials)}
              />
              <FilterCheckRow
                label="Show paused"
                checked={showPaused}
                onToggle={() => onShowPausedChange(!showPaused)}
              />
              <FilterCheckRow
                label="Show cancelled"
                checked={showCancelled}
                onToggle={() => onShowCancelledChange(!showCancelled)}
              />
            </FilterSection>

            {activeFilterCount > 0 && (
              <FilterSection>
                <FilterActionRow label="Clear filters" onClick={onClearFilters} />
              </FilterSection>
            )}
          </PopoverContent>
        </Popover>

        {/* Vertical Divider */}
        <div
          className="h-5 w-px shrink-0"
          style={{ backgroundColor: "var(--border-default)" }}
        />

        {/* Sort Trigger Button */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-2.5 h-full transition-colors focus:outline-none focus-visible:outline-none"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "transparent",
                boxShadow: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              aria-label="Sort items"
            >
              {sortDirection === "asc" ? (
                <ArrowUp className="size-4" />
              ) : (
                <ArrowDown className="size-4" />
              )}
              <span
                className="inline md:hidden text-[11px] font-semibold uppercase"
                style={{ letterSpacing: "0.02em" }}
              >
                Sort
              </span>
              <span
                className="hidden md:inline text-[12px] font-semibold"
                style={{ letterSpacing: "-0.01em" }}
              >
                {selectedSortLabel}
              </span>
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="center"
            className={FILTER_POPOVER_CLASS}
            style={FILTER_POPOVER_SURFACE}
          >
            {/*
              These rows used to be filled green pills with a TRAILING check,
              one divider away from leading-gutter check rows in the filter
              popover — two check positions and two green families
              (`--accent-green` here, `--brand-text` there) in one toolbar.
              Same row shape now: picking one unpicks the rest, which the marks
              already show, so nothing needs a fill to say it is selected.
            */}
            <FilterSection label="Sort by" divider={false}>
              {sortOptions.map((option) => (
                <FilterRadioRow
                  key={option.value}
                  label={option.label}
                  checked={sortBy === option.value}
                  onSelect={() => onSortByChange(option.value)}
                />
              ))}
            </FilterSection>

            {/* Two mutually exclusive options is a segmented control, not a list. */}
            <FilterSection label="Direction">
              <div className="px-2 py-1">
                <SegmentedControl
                  tabs={SORT_DIRECTION_TABS}
                  activeTab={sortDirection}
                  onTabChange={onSortDirectionChange}
                />
              </div>
            </FilterSection>
          </PopoverContent>
        </Popover>

        {/* Vertical Divider - Separates Search/Filter from View Controls */}
        <div
          className="h-5 w-px shrink-0"
          style={{ backgroundColor: "var(--border-default)" }}
        />

        {/* View Mode Segmented Toggle */}
        <div
          className="relative flex items-center h-7 p-0.5 rounded-md overflow-hidden"
          style={{
            backgroundColor: "var(--bg-input)",
          }}
        >
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className="relative z-10 flex items-center justify-center w-7 h-6 rounded-sm transition-colors focus:outline-none focus-visible:outline-none hover:text-[var(--text-primary)]"
            style={{
              color:
                viewMode === "grid"
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
            }}
            aria-label="Grid view"
            title="Grid view"
            aria-pressed={viewMode === "grid"}
          >
            {viewMode === "grid" && (
              <motion.span
                layoutId="view-toggle-pill"
                className="absolute inset-0 rounded-sm"
                style={{
                  backgroundColor: "var(--bg-active)",
                }}
                transition={{
                  type: "spring",
                  stiffness: 520,
                  damping: 38,
                  mass: 0.55,
                }}
              />
            )}
            <LayoutGrid className="size-4 relative z-10" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className="relative z-10 flex items-center justify-center w-7 h-6 rounded-sm transition-colors focus:outline-none focus-visible:outline-none hover:text-[var(--text-primary)]"
            style={{
              color:
                viewMode === "list"
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
            }}
            aria-label="List view"
            title="List view"
            aria-pressed={viewMode === "list"}
          >
            {viewMode === "list" && (
              <motion.span
                layoutId="view-toggle-pill"
                className="absolute inset-0 rounded-sm"
                style={{
                  backgroundColor: "var(--bg-active)",
                }}
                transition={{
                  type: "spring",
                  stiffness: 520,
                  damping: 38,
                  mass: 0.55,
                }}
              />
            )}
            <List className="size-4 relative z-10" />
          </button>
        </div>
      </div>

      {/* Extensibility slot for bulk actions */}
      {children}
    </div>
  );
}
