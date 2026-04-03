import { useEffect, useMemo, useState, memo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  CreditCard,
  Receipt,
  AlertCircle,
  ChevronRight,
  Plus,
} from 'lucide-react';
import GlowDonutChart from './ui/GlowDonutChart';
import type { Category, ItemWithCategory, StatusHistory } from '../types';
import {
  getAllStatusHistory,
  calculateMonthlySpending,
  calculateYearlySpending,
  getSpendingByCategory,
  getUpcomingItems
} from '../services/database';
import { formatCurrency } from '../utils/currency';
import { formatShortDate, getDaysUntil } from '../utils/dates';
import { calculateProjectedMonthlySpendingForMonth } from '../utils/projectedSpending';
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
type DashboardCategorySlice = {
  color: string;
  id: string;
  name: string;
  share: number;
  value: number;
};

const DASHBOARD_SCROLLABLE_CATEGORY_COUNT = 6;

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
  if (previous === 0 && current === 0) {
    if (!showNoBaselineDash) return null;

    return (
      <span className="inline-flex items-center gap-1 text-xs font-mono font-medium" style={{ color: 'var(--text-muted)' }}>
        <Minus className="w-3 h-3" /> -
      </span>
    );
  }

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
      style={{ color: isUp ? 'var(--accent-red)' : 'var(--brand-primary)' }}
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

  // Get the type filter for database queries
  const typeFilter = filterTab === 'all' ? undefined : filterTab;
  const trackedItemIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const statusHistoryKey = useMemo(
    () =>
      items
        .map((item) => `${item.id}:${item.status}`)
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

    getAllStatusHistory()
      .then((historyData) => {
        if (!cancelled) {
          setStatusHistoryEntries(historyData.filter((entry) => trackedItemIds.has(entry.item_id)));
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
  }, [items.length, statusHistoryKey, trackedItemIds]);

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

  const dashboardCategoryData = useMemo<DashboardCategorySlice[]>(() => {
    const categorySlices = spendingByCategory.map((item) => ({
      color: item.category.color,
      id: item.category.id,
      name: item.category.name,
      value: item.total,
    }));

    const total = categorySlices.reduce((sum, item) => sum + item.value, 0);
    const withShare = categorySlices.map((item) => ({
      ...item,
      share: total === 0 ? 0 : item.value / total,
    }));

    return withShare;
  }, [spendingByCategory]);

  const topCategory = useMemo(() => {
    if (dashboardCategoryData.length === 0) return null;

    return dashboardCategoryData.reduce((topEntry, entry) => {
      return entry.value > topEntry.value ? entry : topEntry;
    });
  }, [dashboardCategoryData]);

  const legendSummary = useMemo(() => {
    if (spendingByCategory.length <= DASHBOARD_SCROLLABLE_CATEGORY_COUNT) {
      return `${spendingByCategory.length} active categories`;
    }

    return `${spendingByCategory.length} active categories · scroll`;
  }, [spendingByCategory.length]);

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
      <SegmentedControl tabs={tabs} activeTab={filterTab} onTabChange={setFilterTab} />

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
          accentColor="var(--accent-purple)"
          accentMuted="var(--accent-purple-muted)"
          detail={<TrendBadge current={yearlySpending} previous={prevYearlySpending} showNoBaselineDash />}
          icon={<Calendar className="h-5 w-5" />}
          label="Yearly Run Rate"
          value={formatCurrency(yearlySpending, { display: 'summary' })}
        />

        <DashboardMetricCard
          accentColor="var(--accent-blue)"
          accentMuted="var(--accent-blue-muted)"
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
          accentColor="var(--accent-amber)"
          accentMuted="var(--accent-amber-muted)"
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
                      categoryName={item.category?.name}
                      categoryColor={item.category?.color}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                      <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {formatCurrency(item.amount, { currency: item.currency, display: 'precise' })} · {item.billing_cycle}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold font-mono" style={{
                        color: daysUntil <= 1 ? 'var(--accent-red)' : daysUntil <= 3 ? 'var(--accent-amber)' : 'var(--text-secondary)',
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
                  data={dashboardCategoryData}
                  centerValue={formatCurrency(monthlySpending, { display: 'summary' })}
                  size={263}
                  hoveredIndex={chartHover}
                  onHoverChange={setChartHover}
                />
              </div>

              <div
                className="min-w-0 flex-1 rounded-[24px] p-3 sm:p-3.5 xl:max-w-[18rem]"
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 92%, transparent), color-mix(in srgb, var(--bg-tertiary) 74%, transparent))',
                  boxShadow:
                    'inset 0 0 0 1px color-mix(in srgb, var(--border-default) 76%, transparent), 0 24px 48px -36px color-mix(in srgb, black 46%, transparent)',
                }}
              >
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="label-wide">Category Breakdown</p>
                    <p className="mt-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {legendSummary}
                    </p>
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

                <div className="max-h-[16rem] space-y-1.5 overflow-y-auto pr-1">
                  {dashboardCategoryData.map((item, index) => {
                    const isHovered = chartHover === index;
                    const isDimmed = chartHover !== null && !isHovered;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 rounded-[16px] px-3 py-2.5 transition-all duration-300"
                        style={{
                          opacity: isDimmed ? 0.42 : 1,
                          cursor: 'pointer',
                          background: isHovered
                            ? 'color-mix(in srgb, var(--bg-card) 68%, transparent)'
                            : 'color-mix(in srgb, var(--bg-card) 36%, transparent)',
                          boxShadow: isHovered
                            ? `inset 0 0 0 1px color-mix(in srgb, ${item.color} 22%, transparent), 0 14px 24px -24px color-mix(in srgb, ${item.color} 62%, transparent)`
                            : 'inset 0 0 0 1px color-mix(in srgb, var(--border-default) 55%, transparent)',
                        }}
                        onMouseEnter={() => setChartHover(index)}
                        onMouseLeave={() => setChartHover(null)}
                      >
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-full transition-shadow duration-300"
                          style={{
                            backgroundColor: item.color,
                            boxShadow: isHovered
                              ? `0 0 12px color-mix(in srgb, ${item.color} 85%, transparent)`
                              : `0 0 6px color-mix(in srgb, ${item.color} 38%, transparent)`,
                          }}
                        />

                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {item.name}
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
                      </div>
                    );
                  })}
                </div>
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
