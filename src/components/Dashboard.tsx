import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  CreditCard,
  Receipt,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
} from 'lucide-react';
import GlowDonutChart from './ui/GlowDonutChart';
import type { Category, ItemWithCategory, StatusHistory } from '../types';
import {
  getStatusHistoryForItems,
  calculateMonthlySpending,
  calculateYearlySpending,
  getSpendingByCategory,
  getUpcomingItems
} from '../services/database';
import { createCategoryLookup, resolveItemCategoryDisplay } from '../utils/categories';
import { formatCurrency } from '../utils/currency';
import { formatShortDate, getDaysUntil } from '../utils/dates';
import { calculateProjectedMonthlySpendingForMonth } from '../utils/projectedSpending';
import {
  OTHER_CATEGORY_ID,
  buildCategorySlices,
  foldCategoryTail,
  type CategorySlice,
} from '../utils/categoryFolding';
import ServiceLogo from './ui/ServiceLogo';
import EmptyState from './ui/EmptyState';
import GhostListPreview from './ui/GhostListPreview';
import GhostChartPreview from './ui/GhostChartPreview';
import SegmentedControl from './ui/SegmentedControl';

interface DashboardProps {
  items: ItemWithCategory[];
  categories: Category[];
  onEdit: (item: ItemWithCategory) => void;
  onViewAll?: () => void;
  onAddNew?: () => void;
}

type FilterTab = 'all' | 'bill' | 'subscription';

interface DashboardMetricCardProps {
  accentColor: string;
  accentMuted: string;
  detail?: React.ReactNode;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}

function DashboardMetricCard({
  accentColor,
  accentMuted,
  detail,
  icon,
  label,
  value,
  valueColor,
}: DashboardMetricCardProps) {
  return (
    <div className="stagger-item card">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p className="label-wide">{label}</p>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: accentMuted,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accentColor} 18%, transparent)`,
              color: accentColor,
            }}
          >
            {icon}
          </div>
        </div>
        <p
          className="font-mono"
          style={{
            color: valueColor ?? 'var(--text-primary)',
            fontSize: 'clamp(1.45rem, 3vw, 2rem)',
            fontWeight: 650,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </p>
        <div className="min-h-[2.75rem] text-sm">{detail}</div>
      </div>
    </div>
  );
}

function TrendBadge({
  current,
  previous,
  showNoBaselineDash = false,
}: {
  current: number;
  previous: number;
  showNoBaselineDash?: boolean;
}) {
  if (previous === 0) {
    if (!showNoBaselineDash) return null;

    return (
      <span className="inline-flex items-center gap-1 text-xs font-mono font-medium" style={{ color: 'var(--text-muted)' }}>
        <Minus className="w-3 h-3" /> -
      </span>
    );
  }

  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);

  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-mono font-medium" style={{ color: 'var(--text-muted)' }}>
        <Minus className="w-3 h-3" /> 0%
      </span>
    );
  }

  const isUp = pct > 0;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-mono font-medium"
      style={{ color: isUp ? 'var(--accent-red-text)' : 'var(--brand-primary)' }}
    >
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{pct}%
    </span>
  );
}

function Dashboard({ items, categories, onEdit, onViewAll, onAddNew }: DashboardProps) {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [statusHistoryEntries, setStatusHistoryEntries] = useState<StatusHistory[]>([]);
  const [chartHover, setChartHover] = useState<number | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Get the type filter for database queries
  const typeFilter = filterTab === 'all' ? undefined : filterTab;
  const trackedItemIds = useMemo(() => Array.from(new Set(items.map((item) => item.id))), [items]);
  const trackedItemIdsKey = useMemo(
    () => [...trackedItemIds].sort().join('|'),
    [trackedItemIds],
  );
  const statusHistoryKey = useMemo(
    () =>
      items
        .map((item) => `${item.id}:${item.status}:${item.cancellation_date ?? ''}`)
        .sort()
        .join('|'),
    [items],
  );

  useEffect(() => {
    let cancelled = false;

    if (items.length === 0) {
      setStatusHistoryEntries([]);
      return;
    }

    getStatusHistoryForItems(trackedItemIds)
      .then((historyData) => {
        if (!cancelled) {
          setStatusHistoryEntries(historyData);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load dashboard trend history:', error);
          setStatusHistoryEntries([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [items.length, statusHistoryKey, trackedItemIdsKey]);

  // Compute stats with useMemo (these are pure synchronous functions)
  const monthlySpending = useMemo(
    () => calculateMonthlySpending(items, typeFilter),
    [items, typeFilter]
  );

  const yearlySpending = useMemo(
    () => calculateYearlySpending(items, typeFilter),
    [items, typeFilter]
  );

  const spendingByCategory = useMemo(
    () => getSpendingByCategory(items, categories, typeFilter),
    [items, categories, typeFilter]
  );
  const categoryLookup = useMemo(
    () => createCategoryLookup(categories),
    [categories],
  );

  const upcomingItems = useMemo(
    () => getUpcomingItems(items, 7, typeFilter),
    [items, typeFilter]
  );

  // Filter items by type for counts
  const filteredItems = typeFilter ? items.filter(i => i.item_type === typeFilter) : items;
  const activeCount = filteredItems.filter(s => s.status === 'active').length;
  const pausedCount = filteredItems.filter(s => s.status === 'paused').length;
  const cancelledCount = filteredItems.filter(s => s.status === 'cancelled').length;

  const statusHistoryByItem = useMemo(() => {
    return statusHistoryEntries.reduce<Record<string, StatusHistory[]>>((acc, entry) => {
      (acc[entry.item_id] ||= []).push(entry);
      return acc;
    }, {});
  }, [statusHistoryEntries]);

  const prevMonthlySpending = useMemo(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    return calculateProjectedMonthlySpendingForMonth(
      filteredItems,
      statusHistoryByItem,
      previousMonth
    );
  }, [filteredItems, statusHistoryByItem]);

  const prevYearlySpending = useMemo(() => {
    const now = new Date();
    const sameMonthLastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    return calculateProjectedMonthlySpendingForMonth(
      filteredItems,
      statusHistoryByItem,
      sameMonthLastYear
    ) * 12;
  }, [filteredItems, statusHistoryByItem]);

  // Passing monthlySpending (every active item) lets the slices account for
  // spend that resolves to no live category, so the arcs add up to the centre
  // label instead of silently under-counting it.
  const dashboardCategoryData = useMemo<CategorySlice[]>(
    () => buildCategorySlices(spendingByCategory, monthlySpending),
    [monthlySpending, spendingByCategory],
  );

  const foldedCategories = useMemo(
    () => foldCategoryTail(dashboardCategoryData),
    [dashboardCategoryData],
  );
  const canFoldCategories = foldedCategories.otherCount > 0;
  const visibleCategoryData =
    canFoldCategories && !showAllCategories
      ? foldedCategories.visible
      : dashboardCategoryData;

  const topCategory = useMemo(() => {
    if (dashboardCategoryData.length === 0) return null;

    return dashboardCategoryData.reduce((topEntry, entry) => {
      return entry.value > topEntry.value ? entry : topEntry;
    });
  }, [dashboardCategoryData]);

  // Row indices are the hover key shared with the donut, and folding changes what
  // each index means — so any change to the rendered set must clear the hover.
  const handleFilterTabChange = useCallback((tab: FilterTab) => {
    setFilterTab(tab);
    setShowAllCategories(false);
    setChartHover(null);
  }, []);

  const otherRowRef = useRef<HTMLButtonElement>(null);
  const showLessRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreFocusRef = useRef(false);

  const handleToggleAllCategories = useCallback(() => {
    const activeElement = document.activeElement;
    shouldRestoreFocusRef.current =
      activeElement === otherRowRef.current || activeElement === showLessRef.current;
    setShowAllCategories((previous) => !previous);
    setChartHover(null);
  }, []);

  useEffect(() => {
    if (!shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    if (showAllCategories) {
      showLessRef.current?.focus();
    } else {
      otherRowRef.current?.focus();
    }
  }, [showAllCategories]);

  // Tab config
  const tabs: { id: FilterTab; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All' },
    { id: 'bill', label: 'Bills', icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'subscription', label: 'Subscriptions', icon: <CreditCard className="w-3.5 h-3.5" /> },
  ];

  const activeItemsDetail = pausedCount > 0 || cancelledCount > 0
    ? `${pausedCount > 0 ? `${pausedCount} paused` : ''}${pausedCount > 0 && cancelledCount > 0 ? ' / ' : ''}${cancelledCount > 0 ? `${cancelledCount} cancelled` : ''}`
    : 'All current items are active';

  const dueThisWeekDetail = upcomingItems[0]
    ? `Next: ${upcomingItems[0].name}`
    : 'Nothing due in the next 7 days';

  return (
    <div className="space-y-6">
      <SegmentedControl tabs={tabs} activeTab={filterTab} onTabChange={handleFilterTabChange} />

      {/* First-run: show only the welcome state, hide everything else */}
      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Plus}
            title="Welcome to SubTrkr"
            description="Start tracking your subscriptions and bills to see spending insights, upcoming payments, and more."
            action={onAddNew ? { label: 'Add Your First Item', onClick: onAddNew } : undefined}
            preview={<GhostListPreview variant="item-card" count={3} />}
          />
        </div>
      ) : (
        <>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardMetricCard
          accentColor="var(--brand-primary)"
          accentMuted="var(--brand-muted)"
          detail={<TrendBadge current={monthlySpending} previous={prevMonthlySpending} />}
          icon={<TrendingUp className="h-5 w-5" />}
          label="Projected Monthly"
          value={formatCurrency(monthlySpending, { display: 'summary' })}
        />

        <DashboardMetricCard
          accentColor="var(--text-secondary)"
          accentMuted="var(--bg-hover)"
          detail={<TrendBadge current={yearlySpending} previous={prevYearlySpending} showNoBaselineDash />}
          icon={<Calendar className="h-5 w-5" />}
          label="Yearly Run Rate"
          value={formatCurrency(yearlySpending, { display: 'summary' })}
        />

        <DashboardMetricCard
          accentColor="var(--text-secondary)"
          accentMuted="var(--bg-hover)"
          detail={
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {activeItemsDetail}
            </p>
          }
          icon={filterTab === 'bill' ? <Receipt className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
          label={filterTab === 'bill' ? 'Active Bills' : filterTab === 'subscription' ? 'Active Subscriptions' : 'Active Items'}
          value={activeCount}
        />

        <DashboardMetricCard
          accentColor={upcomingItems.length > 0 ? 'var(--accent-amber)' : 'var(--text-secondary)'}
          accentMuted={upcomingItems.length > 0 ? 'var(--accent-amber-muted)' : 'var(--bg-hover)'}
          detail={
            <p className="truncate text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {dueThisWeekDetail}
            </p>
          }
          icon={<AlertCircle className="h-5 w-5" />}
          label="Due This Week"
          value={upcomingItems.length}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Items */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {filterTab === 'bill' ? 'Upcoming Bills' : filterTab === 'subscription' ? 'Upcoming Renewals' : 'Upcoming Payments'}
          </h3>
          
          {upcomingItems.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming payments"
              description="Payments due in the next 7 days will appear here."
              compact
              preview={<GhostListPreview variant="payment-row" count={2} />}
            />
          ) : (
            <div className="space-y-3">
              {upcomingItems.slice(0, 5).map((item, index) => {
                const daysUntil = getDaysUntil(item.next_billing_date);
                const categoryDisplay = resolveItemCategoryDisplay(item, categoryLookup);

                return (
                  <button
                    key={item.id}
                    onClick={() => onEdit(item)}
                    className="stagger-item w-full flex items-center gap-4 p-3 rounded-xl transition-all group interactive-hover-bg hover:scale-101"
                    style={{
                      animationDelay: `${index * 0.05}s`
                    }}
                  >
                    <ServiceLogo
                      logoUrl={item.logo_url}
                      name={item.name}
                      size="md"
                      itemType={item.item_type}
                      categoryName={categoryDisplay.name}
                      categoryColor={categoryDisplay.color}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                      <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {formatCurrency(item.amount, { currency: item.currency, display: 'precise' })} · {item.billing_cycle}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold font-mono" style={{
                        color: daysUntil <= 1 ? 'var(--accent-red-text)' : daysUntil <= 3 ? 'var(--accent-amber-text)' : 'var(--text-secondary)',
                        fontWeight: 700
                      }}>
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                      </p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {formatShortDate(item.next_billing_date)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  </button>
                );
              })}
              {upcomingItems.length > 5 && onViewAll && (
                <button
                  onClick={onViewAll}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors interactive-hover-bg"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  View all {upcomingItems.length} upcoming
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Spending by Category */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            Spending by Category
          </h3>
          {topCategory && (
            <p className="mb-4 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              Largest share: {topCategory.name} · {Math.round(topCategory.share * 100)}%
            </p>
          )}
          
          {dashboardCategoryData.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No spending data yet"
              description="Category breakdown will appear once you add items."
              compact
              preview={<GhostChartPreview variant="pie-chart" />}
            />
          ) : (
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:gap-7">
              <div className="mx-auto shrink-0 xl:mx-0">
                <GlowDonutChart
                  data={visibleCategoryData}
                  centerValue={formatCurrency(monthlySpending, { display: 'summary' })}
                  size={263}
                  hoveredIndex={chartHover}
                  onHoverChange={setChartHover}
                />
              </div>

              <div
                className="min-w-0 flex-1 rounded-2xl p-3 sm:p-3.5 xl:flex xl:max-w-[18rem] xl:flex-col xl:self-start xl:-mt-1"
                style={{
                  // Flat surface token, matching every other inset panel in the
                  // app (CategorySettings, AccountSettings, NotificationSettings).
                  // The old vertical gradient ramped between two tokens, so once
                  // the panel became content-sized it visibly reshaded on every
                  // expand/collapse.
                  backgroundColor: 'var(--bg-hover)',
                  boxShadow:
                    'inset 0 0 0 1px color-mix(in srgb, var(--border-default) 76%, transparent)',
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="label-wide">Category Breakdown</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-mono font-medium"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--bg-card) 78%, transparent)',
                      color: 'var(--text-secondary)',
                      boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--border-default) 65%, transparent)',
                    }}
                  >
                    {spendingByCategory.length} total
                  </span>
                </div>

                <div className="space-y-1.25">
                  {visibleCategoryData.map((item, index) => {
                    const isHovered = chartHover === index;
                    const isDimmed = chartHover !== null && !isHovered;
                    const isOther = item.id === OTHER_CATEGORY_ID;

                    const rowClassName =
                      'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all duration-300';
                    const rowStyle: React.CSSProperties = {
                      opacity: isDimmed ? 0.42 : 1,
                      cursor: isOther ? 'pointer' : 'default',
                      background: isHovered
                        ? 'color-mix(in srgb, var(--bg-card) 68%, transparent)'
                        : 'color-mix(in srgb, var(--bg-card) 36%, transparent)',
                      boxShadow: isHovered
                        ? `inset 0 0 0 1px color-mix(in srgb, ${item.color} 22%, transparent), 0 14px 24px -24px color-mix(in srgb, ${item.color} 62%, transparent)`
                        : 'inset 0 0 0 1px color-mix(in srgb, var(--border-default) 55%, transparent)',
                    };

                    const rowContent = (
                      <>
                        <div
                          className="h-1.5 w-1.5 shrink-0 rounded-full transition-shadow duration-300"
                          style={{
                            backgroundColor: item.color,
                            // color-mix, not `${color}33` — item.color may be a CSS variable for
                            // the Other slice, and `var(--accent-gray)33` is invalid CSS.
                            boxShadow: isHovered
                              ? `0 0 0 2px color-mix(in srgb, ${item.color} 20%, transparent)`
                              : `0 0 0 2px color-mix(in srgb, ${item.color} 12%, transparent)`,
                          }}
                        />

                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {isOther ? `Other (${foldedCategories.otherCount})` : item.name}
                          </span>
                        </div>

                        <div className="shrink-0 text-right leading-none">
                          <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(item.value, { display: 'summary' })}
                          </p>
                          <p className="mt-1 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                            {Math.round(item.share * 100)}%
                          </p>
                        </div>

                        {isOther && (
                          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                        )}
                      </>
                    );

                    if (isOther) {
                      return (
                        <button
                          key={item.id}
                          ref={otherRowRef}
                          type="button"
                          aria-expanded={showAllCategories}
                          className={rowClassName}
                          style={rowStyle}
                          onClick={handleToggleAllCategories}
                          onMouseEnter={() => setChartHover(index)}
                          onMouseLeave={() => setChartHover(null)}
                        >
                          {rowContent}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className={rowClassName}
                        style={rowStyle}
                        onMouseEnter={() => setChartHover(index)}
                        onMouseLeave={() => setChartHover(null)}
                      >
                        {rowContent}
                      </div>
                    );
                  })}
                </div>
                {canFoldCategories && showAllCategories && (
                  <button
                    ref={showLessRef}
                    type="button"
                    aria-expanded={showAllCategories}
                    onClick={handleToggleAllCategories}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors interactive-hover-bg"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    Show less
                  </button>
                )}
                {canFoldCategories && (
                  <span
                    aria-live="polite"
                    style={{
                      position: 'absolute',
                      width: '1px',
                      height: '1px',
                      overflow: 'hidden',
                      clip: 'rect(0 0 0 0)',
                      whiteSpace: 'nowrap',
                      border: 0,
                    }}
                  >
                    {showAllCategories
                      ? `Showing all ${dashboardCategoryData.length} categories`
                      : `Showing top ${foldedCategories.visible.length} categories`}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default memo(Dashboard);
