import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Category } from '../types';

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
  showPaused: boolean;
  onShowPausedChange: (show: boolean) => void;
  showCancelled: boolean;
  onShowCancelledChange: (show: boolean) => void;

  // Active filter count (for badge)
  activeFilterCount: number;
  onClearFilters: () => void;

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
  showPaused,
  onShowPausedChange,
  showCancelled,
  onShowCancelledChange,
  activeFilterCount,
  onClearFilters,
  children,
}: SearchFilterToolbarProps) {
  return (
    <div className="flex items-center gap-2 max-w-2xl">
      {/* Unified Search + Filter Container */}
      <div
        className="flex items-center flex-1 h-9 rounded-lg border-2 overflow-hidden transition-all duration-200 group"
        style={{
          backgroundColor: 'var(--bg-input)',
          borderColor: 'var(--border-default)',
        }}
      >
        {/* Search Icon */}
        <div className="flex items-center justify-center pl-3">
          <Search className="size-4" style={{ color: 'var(--text-muted)' }} />
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 h-full px-2.5 text-sm font-medium bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none"
          style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 500,
            color: 'var(--text-primary)',
            boxShadow: 'none',
          }}
        />

        {/* Clear Search Button */}
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="flex items-center justify-center px-2 h-full transition-colors focus:outline-none focus-visible:outline-none"
            style={{ color: 'var(--text-muted)', boxShadow: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X className="size-3.5" />
          </button>
        )}

        {/* Vertical Divider */}
        <div
          className="h-5 w-px shrink-0"
          style={{ backgroundColor: 'var(--border-default)' }}
        />

        {/* Filter Trigger Button */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="flex items-center justify-center px-3 h-full relative transition-colors focus:outline-none focus-visible:outline-none"
              style={{ color: 'var(--text-secondary)', boxShadow: 'none' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Filter className="size-4" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="center"
            className="w-72 p-0 overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              boxShadow: 'var(--shadow-elevated)',
            }}
          >
            <div className="p-4 space-y-4">
              {/* Category Select */}
              <div className="space-y-2.5">
                <label
                  className="block text-[11px] font-semibold tracking-wider"
                  style={{
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Category
                </label>
                <Select value={selectedCategory} onValueChange={onCategoryChange}>
                  <SelectTrigger
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator style={{ backgroundColor: 'var(--border-default)' }} />

              {/* Status Checkboxes */}
              <div className="space-y-3">
                <label
                  className="block text-[11px] font-semibold tracking-wider"
                  style={{
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Status
                </label>
                <div className="space-y-2.5">
                  <label
                    htmlFor="show-paused"
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <Checkbox
                      id="show-paused"
                      checked={showPaused}
                      onCheckedChange={(checked) => onShowPausedChange(checked as boolean)}
                    />
                    <span
                      className="text-sm font-medium transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Show paused
                    </span>
                  </label>
                  <label
                    htmlFor="show-cancelled"
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <Checkbox
                      id="show-cancelled"
                      checked={showCancelled}
                      onCheckedChange={(checked) => onShowCancelledChange(checked as boolean)}
                    />
                    <span
                      className="text-sm font-medium transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Show cancelled
                    </span>
                  </label>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <>
                  <Separator style={{ backgroundColor: 'var(--border-default)' }} />
                  <Button
                    variant="ghost"
                    className="w-full h-9 font-semibold"
                    onClick={onClearFilters}
                    style={{
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Clear all filters
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Extensibility slot for future toolbar items */}
      {children}
    </div>
  );
}
