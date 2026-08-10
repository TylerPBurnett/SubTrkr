import {
  Search,
  Filter,
  X,
  LayoutGrid,
  List,
  ArrowDown,
  ArrowUp,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FilterCheckRow,
  FilterCountBadge,
} from "@/components/ui/FilterMenu";
import type { Category } from "@/types";

// Refined select item styles
const selectItemStyles = `
  .refined-select-item[data-highlighted] {
    background-color: var(--accent-green-muted) !important;
    color: var(--text-primary) !important;
  }
  .refined-select-item[data-state="checked"] {
    background-color: var(--accent-green-muted) !important;
    color: var(--accent-green) !important;
  }
  .refined-select-item[data-state="checked"] svg {
    color: var(--accent-green) !important;
    opacity: 0.8;
  }
`;

interface SearchFilterToolbarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;

  // Category filter
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;

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
  selectedCategory,
  onCategoryChange,
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

  return (
    <>
      <style>{selectItemStyles}</style>
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
              className="w-[280px] p-0 overflow-hidden"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-strong)",
                boxShadow:
                  "0 8px 32px -8px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--border-strong)",
                borderRadius: "12px",
              }}
            >
              {/* Header */}
              <div
                className="px-4 pt-3.5 pb-3"
                style={{
                  borderBottom: "1px solid var(--border-default)",
                }}
              >
                <h3
                  className="text-[13px] font-semibold tracking-tight"
                  style={{
                    color: "var(--text-primary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {`Filter ${filterLabel}`}
                </h3>
              </div>

              <div className="p-3.5 space-y-4">
                {/* Category Select */}
                <div className="space-y-2">
                  <label
                    className="block text-[11px] font-medium"
                    style={{
                      color: "var(--text-muted)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Category
                  </label>
                  <Select
                    value={selectedCategory}
                    onValueChange={onCategoryChange}
                  >
                    <SelectTrigger
                      className="h-8 text-[13px]"
                      style={{
                        backgroundColor: "var(--bg-input)",
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent
                      className="min-w-[240px]"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        borderColor: "var(--border-strong)",
                        boxShadow:
                          "0 8px 32px -8px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--border-strong)",
                        borderRadius: "8px",
                        padding: "4px",
                      }}
                    >
                      <SelectItem
                        value="all"
                        className="refined-select-item text-[13px] font-medium rounded-md px-2.5 py-1.5 mb-0.5 focus:bg-transparent"
                        style={{
                          color: "var(--text-secondary)",
                          letterSpacing: "-0.005em",
                        }}
                      >
                        All Categories
                      </SelectItem>
                      {categories.map((cat) => (
                        <SelectItem
                          key={cat.id}
                          value={cat.id}
                          className="refined-select-item text-[13px] font-medium rounded-md px-2.5 py-1.5 mb-0.5 focus:bg-transparent"
                          style={{
                            color: "var(--text-secondary)",
                            letterSpacing: "-0.005em",
                          }}
                        >
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subtle Divider */}
                <div
                  style={{
                    height: "1px",
                    background: "var(--border-default)",
                    margin: "12px 0",
                  }}
                />

                {/* Status rows */}
                <div>
                  <label
                    className="block text-[11px] font-medium mb-1.5"
                    style={{
                      color: "var(--text-muted)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Visibility
                  </label>
                  <div className="-mx-1.5">
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
                  </div>
                </div>
              </div>

              {/* Clear Filters Footer */}
              {activeFilterCount > 0 && (
                <div
                  className="px-3 pb-3 pt-2"
                  style={{
                    borderTop: "1px solid var(--border-default)",
                  }}
                >
                  <button
                    onClick={onClearFilters}
                    className="w-full h-8 rounded-md text-[12px] font-semibold transition-all"
                    style={{
                      backgroundColor: "transparent",
                      color: "var(--text-secondary)",
                      letterSpacing: "0.005em",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                  >
                    Clear filters
                  </button>
                </div>
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
              className="w-[280px] p-0 overflow-hidden"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-strong)",
                boxShadow:
                  "0 8px 32px -8px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--border-strong)",
                borderRadius: "12px",
              }}
            >
              <div
                className="px-4 pt-3.5 pb-3"
                style={{
                  borderBottom: "1px solid var(--border-default)",
                }}
              >
                <h3
                  className="text-[13px] font-semibold tracking-tight"
                  style={{
                    color: "var(--text-primary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Sort {filterLabel}
                </h3>
              </div>

              <div className="p-3.5 space-y-4">
                <div className="space-y-2">
                  <label
                    className="block text-[11px] font-medium"
                    style={{
                      color: "var(--text-muted)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Sort by
                  </label>
                  <div className="space-y-1">
                    {sortOptions.map((option) => {
                      const isSelected = sortBy === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onSortByChange(option.value)}
                          className="w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors"
                          style={{
                            backgroundColor: isSelected
                              ? "var(--accent-green-muted)"
                              : "transparent",
                            color: isSelected
                              ? "var(--accent-green)"
                              : "var(--text-secondary)",
                            letterSpacing: "-0.005em",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor =
                                "var(--bg-hover)";
                              e.currentTarget.style.color =
                                "var(--text-primary)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                              e.currentTarget.style.color =
                                "var(--text-secondary)";
                            }
                          }}
                        >
                          <span>{option.label}</span>
                          {isSelected ? (
                            <Check className="size-3.5 opacity-80" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    height: "1px",
                    background: "var(--border-default)",
                  }}
                />

                <div className="space-y-2">
                  <label
                    className="block text-[11px] font-medium"
                    style={{
                      color: "var(--text-muted)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Direction
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSortDirectionChange("asc")}
                      className="h-8 rounded-md text-[12px] font-semibold transition-colors"
                      style={{
                        backgroundColor:
                          sortDirection === "asc"
                            ? "var(--accent-green-muted)"
                            : "var(--bg-input)",
                        color:
                          sortDirection === "asc"
                            ? "var(--accent-green)"
                            : "var(--text-secondary)",
                        border: "1px solid var(--border-default)",
                        letterSpacing: "0.005em",
                      }}
                    >
                      Ascending
                    </button>
                    <button
                      type="button"
                      onClick={() => onSortDirectionChange("desc")}
                      className="h-8 rounded-md text-[12px] font-semibold transition-colors"
                      style={{
                        backgroundColor:
                          sortDirection === "desc"
                            ? "var(--accent-green-muted)"
                            : "var(--bg-input)",
                        color:
                          sortDirection === "desc"
                            ? "var(--accent-green)"
                            : "var(--text-secondary)",
                        border: "1px solid var(--border-default)",
                        letterSpacing: "0.005em",
                      }}
                    >
                      Descending
                    </button>
                  </div>
                </div>
              </div>
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
    </>
  );
}
