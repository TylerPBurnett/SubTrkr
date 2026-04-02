import { memo, useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  Calendar,
  CreditCard,
  Minus,
  PiggyBank,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  Category,
  ItemStatus,
  ItemType,
  ItemWithCategory,
  StatusHistory,
} from '@/types';
import {
  calculateMonthlySavings,
  calculateMonthlySpending,
  calculateYearlySpending,
  getAllStatusHistory,
  getSpendingByCategory,
} from '../services/database';
import { formatCurrency } from '../utils/currency';
import { addBillingCycle, formatDisplayDate, parseLocalDate } from '../utils/dates';
import {
  getResolvedStatusHistoryAction,
  getResolvedStatusHistoryEffectiveDate,
} from '../utils/statusHistory';
import ServiceLogo from './ui/ServiceLogo';
import { GlowFilter, GradientFill, lightenColor } from './ui/ChartEffects';
import SegmentedControl from './ui/SegmentedControl';
import EmptyState from './ui/EmptyState';
import GhostListPreview from './ui/GhostListPreview';
import GhostChartPreview from './ui/GhostChartPreview';

type FilterTab = 'all' | ItemType;
type TrendRange = '6m' | '12m';
type TrendDirection = 'up' | 'down' | 'flat';

interface AnalyticsProps {
  items: ItemWithCategory[];
  categories: Category[];
}

type StatusTransition = {
  status: ItemStatus;
  effectiveDate: Date;
  action: string | null;
  recordedAt: Date | null;
};

type TrendSummary = {
  amountDelta: number;
  direction: TrendDirection;
  percentage: number;
};

type MonthlyTrendPoint = {
  month: string;
  projected: number;
  tooltipLabel: string;
};

type TrendOverview = {
  average: number;
  peak: MonthlyTrendPoint | null;
};

type CategoryInsight = {
  amount: number;
  color: string;
  count: number;
  id: string;
  name: string;
  share: number;
};

type CancelledInsightItem = ItemWithCategory & {
  monthlyAmount: number;
};

interface MetricCardProps {
  accentColor: string;
  accentMuted: string;
  detail?: React.ReactNode;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  value: React.ReactNode;
  valueColor?: string;
}

const FILTER_TABS: { id: FilterTab; label: string; icon?: React.ReactNode }[] = [
  { id: 'all', label: 'All' },
  { id: 'bill', icon: <Receipt className="h-3.5 w-3.5" />, label: 'Bills' },
  { id: 'subscription', icon: <CreditCard className="h-3.5 w-3.5" />, label: 'Subscriptions' },
];

const TREND_RANGE_TABS: { id: TrendRange; label: string }[] = [
  { id: '6m', label: '6M' },
  { id: '12m', label: '12M' },
];

function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function getMonthlyAmount(item: ItemWithCategory): number {
  switch (item.billing_cycle) {
    case 'weekly':
      return (item.amount * 52) / 12;
    case 'monthly':
      return item.amount;
    case 'quarterly':
      return item.amount / 3;
    case 'yearly':
      return item.amount / 12;
    default:
      return item.amount;
  }
}

function getCancelledInsightDate(item: ItemWithCategory): string | null {
  return item.cancellation_date || item.cancelled_at || item.archived_at || null;
}

function parseDateValue(value: string | null | undefined): Date | null {
  if (!value) return null;

  const parsed = value.includes('T') ? new Date(value) : parseLocalDate(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeToStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function shiftDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function isOnOrBeforeDay(date: Date, comparedTo: Date): boolean {
  return normalizeToStartOfDay(date).getTime() <= normalizeToStartOfDay(comparedTo).getTime();
}

function countBillingsWithinWindow(
  item: ItemWithCategory,
  windowStart: Date,
  windowEnd: Date
): number {
  const nextBillingDate = parseDateValue(item.next_billing_date);
  if (!nextBillingDate) return 0;

  let occurrenceDate = normalizeToStartOfDay(nextBillingDate);
  if (occurrenceDate < windowStart) return 0;

  let occurrenceCount = 0;

  while (occurrenceDate <= windowEnd) {
    occurrenceCount += 1;

    const nextOccurrenceDate = normalizeToStartOfDay(addBillingCycle(occurrenceDate, item.billing_cycle));
    if (nextOccurrenceDate.getTime() === occurrenceDate.getTime()) {
      break;
    }

    occurrenceDate = nextOccurrenceDate;
  }

  return occurrenceCount;
}

function getMonthRange(date: Date): { start: Date; endExclusive: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const endExclusive = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, endExclusive };
}

function getStatusTransitions(statusHistory: StatusHistory[]): StatusTransition[] {
  const historyEntries = statusHistory
    .map((entry) => {
      const effectiveDate =
        parseDateValue(getResolvedStatusHistoryEffectiveDate(entry)) ?? parseDateValue(entry.changed_at);
      if (!effectiveDate) return null;

      return {
        action: getResolvedStatusHistoryAction(entry),
        effectiveDate: normalizeToStartOfDay(effectiveDate),
        recordedAt: parseDateValue(entry.changed_at),
        status: entry.status,
      };
    })
    .filter((entry): entry is StatusTransition => entry !== null);

  const byRecordedOrder = [...historyEntries].sort((lhs, rhs) => {
    const lhsRecordedAt = lhs.recordedAt ?? lhs.effectiveDate;
    const rhsRecordedAt = rhs.recordedAt ?? rhs.effectiveDate;
    return lhsRecordedAt.getTime() - rhsRecordedAt.getTime();
  });

  const normalizedTransitions: StatusTransition[] = [];

  for (const entry of byRecordedOrder) {
    if (entry.action === 'edit_cancellation') {
      for (let index = normalizedTransitions.length - 1; index >= 0; index -= 1) {
        const previous = normalizedTransitions[index];
        if (
          previous.status === 'cancelled'
          && (previous.action === 'cancel' || previous.action === 'trial_expired' || previous.action === null)
        ) {
          normalizedTransitions[index] = {
            ...previous,
            effectiveDate: entry.effectiveDate,
          };
          break;
        }
      }
      continue;
    }

    normalizedTransitions.push(entry);
  }

  return normalizedTransitions.sort((lhs, rhs) => {
    if (lhs.effectiveDate.getTime() !== rhs.effectiveDate.getTime()) {
      return lhs.effectiveDate.getTime() - rhs.effectiveDate.getTime();
    }

    const lhsRecordedAt = lhs.recordedAt ?? lhs.effectiveDate;
    const rhsRecordedAt = rhs.recordedAt ?? rhs.effectiveDate;
    return lhsRecordedAt.getTime() - rhsRecordedAt.getTime();
  });
}

function inferredInitialStatus(item: ItemWithCategory, transitions: StatusTransition[]): ItemStatus {
  if (transitions[0]?.action === 'convert_trial') {
    return 'trial';
  }

  if (item.status === 'trial' || item.trial_started_at) {
    return 'trial';
  }

  return 'active';
}

function wasItemActiveUsingCurrentFields(
  item: ItemWithCategory,
  monthStart: Date,
  monthEndExclusive: Date
): boolean {
  const monthEnd = new Date(monthEndExclusive.getTime() - 1000);
  const startDate = parseDateValue(item.start_date) ?? parseDateValue(item.created_at);

  if (!startDate || startDate > monthEnd || item.status === 'trial') {
    return false;
  }

  const cancellationDate = parseDateValue(item.cancellation_date);
  if (cancellationDate && isOnOrBeforeDay(cancellationDate, monthStart)) {
    return false;
  }

  const cancelledAt = parseDateValue(item.cancelled_at);
  if (cancelledAt && isOnOrBeforeDay(cancelledAt, monthStart)) {
    return false;
  }

  const archivedAt = parseDateValue(item.archived_at);
  if (archivedAt && isOnOrBeforeDay(archivedAt, monthStart)) {
    return false;
  }

  const pausedAt = parseDateValue(item.paused_at);
  if (pausedAt && isOnOrBeforeDay(pausedAt, monthStart)) {
    const pausedUntil = parseDateValue(item.paused_until);
    if (pausedUntil) {
      return !isOnOrBeforeDay(monthEnd, pausedUntil);
    }

    return item.status !== 'paused';
  }

  return true;
}

function wasItemActive(
  item: ItemWithCategory,
  monthStart: Date,
  monthEndExclusive: Date,
  statusHistory: StatusHistory[]
): boolean {
  if (statusHistory.length === 0) {
    return wasItemActiveUsingCurrentFields(item, monthStart, monthEndExclusive);
  }

  const startDate = parseDateValue(item.start_date) ?? parseDateValue(item.created_at);
  if (!startDate) return false;

  const normalizedStartDate = normalizeToStartOfDay(startDate);
  if (normalizedStartDate >= monthEndExclusive) {
    return false;
  }

  const transitions = getStatusTransitions(statusHistory);
  let currentStatus = inferredInitialStatus(item, transitions);
  let segmentStart = normalizedStartDate;

  for (const transition of transitions) {
    const transitionDate = transition.effectiveDate;

    if (transitionDate <= segmentStart) {
      currentStatus = transition.status;
      continue;
    }

    if (currentStatus === 'active' && segmentStart < monthEndExclusive && transitionDate > monthStart) {
      return true;
    }

    if (transitionDate >= monthEndExclusive) {
      break;
    }

    currentStatus = transition.status;
    segmentStart = transitionDate;
  }

  return currentStatus === 'active' && segmentStart < monthEndExclusive;
}

function buildTrendSummary(current: number, previous: number): TrendSummary {
  if (previous === 0) {
    return {
      amountDelta: current,
      direction: current === 0 ? 'flat' : 'up',
      percentage: 0,
    };
  }

  const amountDelta = current - previous;
  const percentage = Math.abs((amountDelta / previous) * 100);

  if (Math.abs(amountDelta) < 0.5) {
    return { amountDelta, direction: 'flat', percentage: 0 };
  }

  return {
    amountDelta,
    direction: amountDelta > 0 ? 'up' : 'down',
    percentage,
  };
}

function MetricCard({
  accentColor,
  accentMuted,
  detail,
  icon,
  label,
  primary,
  value,
  valueColor,
}: MetricCardProps) {
  return (
    <div
      className="stagger-item card"
      style={primary ? {
        borderLeft: `3px solid var(--brand-primary)`,
      } : undefined}
    >
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
          }}
        >
          {value}
        </p>
        <div className="min-h-[2.75rem] text-sm">{detail}</div>
      </div>
    </div>
  );
}

function TrendDelta({
  baselineLabel,
  summary,
}: {
  baselineLabel: string;
  summary: TrendSummary;
}) {
  if (summary.percentage === 0 && summary.amountDelta === 0) {
    return (
      <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
        Stable vs {baselineLabel}
      </p>
    );
  }

  if (summary.percentage === 0 && summary.amountDelta > 0) {
    return (
      <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
        No comparable baseline vs {baselineLabel}
      </p>
    );
  }

  const isUp = summary.direction === 'up';
  const Icon = summary.direction === 'flat' ? Minus : isUp ? TrendingUp : TrendingDown;

  return (
    <div
      className="inline-flex items-center gap-2 text-sm font-mono"
      style={{
        color:
          summary.direction === 'flat'
            ? 'var(--text-muted)'
            : isUp
            ? 'var(--accent-red)'
            : 'var(--accent-emerald)',
      }}
    >
      <Icon className="h-4 w-4" />
      <span>
        {isUp ? '+' : '-'}
        {formatCurrency(Math.abs(summary.amountDelta), { display: 'summary' })} ({summary.percentage.toFixed(1)}%) vs {baselineLabel}
      </span>
    </div>
  );
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthlyTrendPoint; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const { tooltipLabel, projected } = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-elevated)',
        padding: '10px 14px',
        minWidth: '148px',
      }}
    >
      <p
        style={{
          color: 'var(--text-secondary)',
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          marginBottom: '8px',
          textTransform: 'uppercase',
        }}
      >
        {tooltipLabel}
      </p>
      <p
        style={{
          color: 'var(--text-primary)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '18px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginBottom: '4px',
        }}
      >
        {formatCurrency(projected, { display: 'summary' })}
        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 400, marginLeft: '3px' }}>/mo</span>
      </p>
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
        Projected spend
      </p>
    </div>
  );
}

function CategoryTooltip({ active, payload }: { active?: boolean; payload?: { payload: CategoryInsight }[] }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-elevated)',
        padding: '10px 14px',
        minWidth: '148px',
      }}
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <span
          style={{
            backgroundColor: data.color,
            borderRadius: '50%',
            boxShadow: `0 0 0 2px ${data.color}20`,
            flexShrink: 0,
            height: '6px',
            width: '6px',
          }}
        />
        <span
          style={{
            color: 'var(--text-secondary)',
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {data.name}
        </span>
      </div>
      <p
        style={{
          color: 'var(--text-primary)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '18px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginBottom: '4px',
        }}
      >
        {formatCurrency(data.amount, { display: 'summary' })}
        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 400, marginLeft: '3px' }}>/mo</span>
      </p>
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
        {formatShare(data.share)} of spend · {data.count} {data.count === 1 ? 'item' : 'items'}
      </p>
    </div>
  );
}

function Analytics({
  items,
  categories,
}: AnalyticsProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [statusHistoryEntries, setStatusHistoryEntries] = useState<StatusHistory[]>([]);
  const [trendRange, setTrendRange] = useState<TrendRange>('6m');

  useEffect(() => {
    let cancelled = false;

    if (items.length === 0) {
      setStatusHistoryEntries([]);
      return;
    }

    const itemIdSet = new Set(items.map((item) => item.id));

    getAllStatusHistory()
      .then((historyData) => {
        if (!cancelled) {
          setStatusHistoryEntries(historyData.filter((entry) => itemIdSet.has(entry.item_id)));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load analytics support data:', error);
          setStatusHistoryEntries([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items;
    return items.filter((item) => item.item_type === activeTab);
  }, [activeTab, items]);

  const { activeCount, pausedCount, totalCancelledCount } = useMemo(() => {
    let nextActiveCount = 0;
    let nextPausedCount = 0;
    let nextTotalCancelledCount = 0;

    for (const item of filteredItems) {
      if (item.status === 'active') {
        nextActiveCount += 1;
      } else if (item.status === 'paused') {
        nextPausedCount += 1;
      } else if (item.status === 'cancelled' || item.status === 'archived') {
        nextTotalCancelledCount += 1;
      }
    }

    return {
      activeCount: nextActiveCount,
      pausedCount: nextPausedCount,
      totalCancelledCount: nextTotalCancelledCount,
    };
  }, [filteredItems]);

  const monthlySpending = useMemo(
    () => calculateMonthlySpending(filteredItems),
    [filteredItems]
  );

  const yearlySpending = useMemo(
    () => calculateYearlySpending(filteredItems),
    [filteredItems]
  );

  const monthlySavings = useMemo(
    () => calculateMonthlySavings(filteredItems),
    [filteredItems]
  );

  const spendingByCategory = useMemo(
    () => getSpendingByCategory(filteredItems, categories, activeTab === 'all' ? undefined : activeTab),
    [activeTab, categories, filteredItems]
  );

  const categoryInsights = useMemo<CategoryInsight[]>(() => {
    const totalSpend = spendingByCategory.reduce((total, item) => total + item.total, 0);

    return spendingByCategory.map((item) => ({
      amount: Math.round(item.total),
      color: item.category.color,
      count: item.count,
      id: item.category.id,
      name: item.category.name,
      share: totalSpend === 0 ? 0 : item.total / totalSpend,
    }));
  }, [spendingByCategory]);

  const statusHistoryByItem = useMemo(() => {
    return statusHistoryEntries.reduce<Record<string, StatusHistory[]>>((acc, entry) => {
      (acc[entry.item_id] ||= []).push(entry);
      return acc;
    }, {});
  }, [statusHistoryEntries]);

  const resolvedSelectedCategoryId = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categoryInsights.some((category) => category.id === selectedCategoryId) ? selectedCategoryId : null;
  }, [categoryInsights, selectedCategoryId]);

  const upcomingObligationSummary = useMemo(() => {
    const today = normalizeToStartOfDay(new Date());
    const windowEnd = shiftDays(today, 6);

    let count = 0;
    let total = 0;
    let largestItem: ItemWithCategory | null = null;

    for (const item of filteredItems) {
      if (item.status !== 'active') continue;

      const occurrenceCount = countBillingsWithinWindow(item, today, windowEnd);
      if (occurrenceCount === 0) continue;

      count += occurrenceCount;
      total += item.amount * occurrenceCount;

      if (!largestItem || item.amount > largestItem.amount) {
        largestItem = item;
      }
    }

    return {
      count,
      largestItem,
      total,
    };
  }, [filteredItems]);

  const monthlyTrendData = useMemo<MonthlyTrendPoint[]>(() => {
    const monthCount = trendRange === '12m' ? 12 : 6;
    const months: MonthlyTrendPoint[] = [];
    const now = new Date();

    for (let index = monthCount - 1; index >= 0; index -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const { endExclusive, start } = getMonthRange(monthDate);

      const projected = filteredItems.reduce((total, item) => {
        return wasItemActive(item, start, endExclusive, statusHistoryByItem[item.id] ?? [])
          ? total + getMonthlyAmount(item)
          : total;
      }, 0);

      months.push({
        month: start.toLocaleDateString('en-US', { month: 'short' }),
        projected: Math.round(projected),
        tooltipLabel: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      });
    }

    return months;
  }, [filteredItems, statusHistoryByItem, trendRange]);

  const hasTrendData = monthlyTrendData.some((entry) => entry.projected > 0);

  const projectedTrend = useMemo(() => {
    if (monthlyTrendData.length < 2) return buildTrendSummary(0, 0);
    const current = monthlyTrendData[monthlyTrendData.length - 1]?.projected ?? 0;
    const previous = monthlyTrendData[monthlyTrendData.length - 2]?.projected ?? 0;
    return buildTrendSummary(current, previous);
  }, [monthlyTrendData]);

  const trendOverview = useMemo<TrendOverview>(() => {
    if (monthlyTrendData.length === 0) {
      return { average: 0, peak: null };
    }

    let totalProjected = 0;
    let peak = monthlyTrendData[0];

    for (const entry of monthlyTrendData) {
      totalProjected += entry.projected;
      if (entry.projected > peak.projected) {
        peak = entry;
      }
    }

    return {
      average: Math.round(totalProjected / monthlyTrendData.length),
      peak,
    };
  }, [monthlyTrendData]);

  const focusedItems = useMemo(() => {
    if (!resolvedSelectedCategoryId) return filteredItems;
    return filteredItems.filter((item) => item.category_id === resolvedSelectedCategoryId);
  }, [filteredItems, resolvedSelectedCategoryId]);

  const selectedCategory = useMemo(
    () => categoryInsights.find((category) => category.id === resolvedSelectedCategoryId) ?? null,
    [categoryInsights, resolvedSelectedCategoryId]
  );

  const topItems = useMemo(() => {
    return focusedItems
      .filter((item) => item.status === 'active')
      .map((item) => ({ ...item, monthlyAmount: getMonthlyAmount(item) }))
      .sort((lhs, rhs) => rhs.monthlyAmount - lhs.monthlyAmount)
      .slice(0, 5);
  }, [focusedItems]);

  const cancelledItems = useMemo<CancelledInsightItem[]>(() => {
    return focusedItems
      .filter((item) => item.status === 'cancelled' || item.status === 'archived')
      .map((item) => ({ ...item, monthlyAmount: getMonthlyAmount(item) }))
      .sort((lhs, rhs) => {
        const insightDateA = getCancelledInsightDate(lhs);
        const insightDateB = getCancelledInsightDate(rhs);
        const dateA = insightDateA ? (parseDateValue(insightDateA) ?? new Date(0)) : new Date(0);
        const dateB = insightDateB ? (parseDateValue(insightDateB) ?? new Date(0)) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [focusedItems]);

  const cancellationInsights = useMemo(() => {
    const today = normalizeToStartOfDay(new Date());
    const last30Days = shiftDays(today, -29);

    let recentSavings = 0;
    let recentCount = 0;
    let totalSavings = 0;
    let largestCut: CancelledInsightItem | null = null;

    for (const item of cancelledItems) {
      totalSavings += item.monthlyAmount;

      if (!largestCut || item.monthlyAmount > largestCut.monthlyAmount) {
        largestCut = item;
      }

      const endedAt = parseDateValue(getCancelledInsightDate(item));
      if (endedAt && normalizeToStartOfDay(endedAt) >= last30Days) {
        recentSavings += item.monthlyAmount;
        recentCount += 1;
      }
    }

    return {
      largestCut,
      recentCount,
      recentSavings,
      totalSavings,
    };
  }, [cancelledItems]);

  const categoryAxisWidth = useMemo(() => {
    const maxLabelLength = categoryInsights.reduce((maxLength, category) => Math.max(maxLength, category.name.length), 0);
    return Math.min(132, Math.max(84, Math.min(maxLabelLength, 16) * 6.2));
  }, [categoryInsights]);

  const CATEGORY_SCROLL_THRESHOLD = 8;
  const CATEGORY_ROW_TARGET_HEIGHT = 44;
  const categoryChartScrollable = categoryInsights.length > CATEGORY_SCROLL_THRESHOLD;
  const categoryChartScrollHeight = categoryInsights.length * CATEGORY_ROW_TARGET_HEIGHT;

  const CAT_TAB_MAX = 8;
  const visibleCategoryTabs = categoryInsights.slice(0, CAT_TAB_MAX);
  const hiddenCategoryCount = Math.max(0, categoryInsights.length - CAT_TAB_MAX);

  const itemCollectionLabel = activeTab === 'bill' ? 'bills' : activeTab === 'subscription' ? 'subscriptions' : 'items';
  const selectedCategoryLabel = selectedCategory ? `${selectedCategory.name} ${itemCollectionLabel}` : itemCollectionLabel;
  const trendDescription =
    activeTab === 'bill'
      ? 'A month-by-month view of your projected bill obligations.'
      : activeTab === 'subscription'
      ? 'A month-by-month view of your projected subscription spend.'
      : 'A month-by-month view of your projected recurring obligations.';
  const trendAverageLabel = trendRange === '12m' ? '12M average' : '6M average';
  const trendRangeCopy = trendRange === '12m' ? 'Past 12 months' : 'Past 6 months';

  return (
    <div className="space-y-6">
      <SegmentedControl tabs={FILTER_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accentColor="var(--brand-primary)"
          accentMuted="var(--brand-muted)"
          detail={
            <>
              <TrendDelta baselineLabel="last month" summary={projectedTrend} />
              <p className="mt-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {activeCount} live · {pausedCount} paused
              </p>
            </>
          }
          icon={<TrendingUp className="h-5 w-5" />}
          label="Monthly Spend"
          primary
          value={formatCurrency(monthlySpending, { display: 'summary' })}
        />

        <MetricCard
          accentColor="var(--accent-blue)"
          accentMuted="var(--accent-blue-muted)"
          detail={
            <>
              <p className="mt-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {upcomingObligationSummary.count} charges in the next 7 days
              </p>
              {upcomingObligationSummary.largestItem ? (
                <p className="mt-1 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                  Largest charge: {upcomingObligationSummary.largestItem.name}
                </p>
              ) : null}
            </>
          }
          icon={<Calendar className="h-5 w-5" />}
          label="Next 7 Days"
          value={formatCurrency(upcomingObligationSummary.total, { display: 'summary' })}
        />

        <MetricCard
          accentColor="var(--accent-emerald)"
          accentMuted="var(--accent-emerald-muted)"
          detail={
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              From {totalCancelledCount} cancelled or archived
            </p>
          }
          icon={<PiggyBank className="h-5 w-5" />}
          label="Saved"
          value={formatCurrency(monthlySavings, { display: 'summary' })}
          valueColor="var(--accent-emerald)"
        />

        <MetricCard
          accentColor="var(--accent-purple)"
          accentMuted="var(--accent-purple-muted)"
          detail={
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              Recurring commitments at today&apos;s pace
            </p>
          }
          icon={<RefreshCw className="h-5 w-5" />}
          label="Annual View"
          value={formatCurrency(yearlySpending, { display: 'summary' })}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.25fr_minmax(0,1fr)] xl:items-stretch">
        <div className="card animate-in flex h-full flex-col" style={{ animationDelay: '0.2s' }}>
          <div
            className="mb-5 rounded-[1.25rem] border p-4 sm:p-5"
            style={{
              background: 'linear-gradient(140deg, var(--trend-banner-bg-start) 0%, var(--trend-banner-bg-end) 100%)',
              border: '1px solid var(--trend-banner-border)',
            }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div
                  className="label-wide inline-flex items-center gap-2 rounded-full px-3 py-1"
                  style={{
                    backgroundColor: 'var(--trend-badge-bg)',
                    border: '1px solid var(--trend-banner-border)',
                    color: 'var(--brand-text)',
                  }}
                >
                  Projected obligations
                </div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                  Monthly Spending Trend
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {trendDescription}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 lg:items-end">
                <div
                  className="inline-flex items-center gap-1 rounded-full p-1"
                  style={{
                    backgroundColor: 'var(--trend-toggle-bg)',
                    border: '1px solid var(--trend-banner-border)',
                  }}
                >
                  <span
                    className="label-wide px-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    View
                  </span>
                  {TREND_RANGE_TABS.map((tab) => {
                    const isActive = tab.id === trendRange;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTrendRange(tab.id)}
                        aria-pressed={isActive}
                        className="rounded-full px-3 py-2 text-xs font-semibold transition-colors"
                        style={{
                          backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                          boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {trendRangeCopy}
                </p>
              </div>
            </div>
          </div>

          {!hasTrendData ? (
            <EmptyState
              icon={TrendingUp}
              title="No spending data yet"
              description="Your monthly spending trend will appear here."
              compact
              preview={<GhostChartPreview variant="area-chart" />}
            />
          ) : (
            <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ left: 4, right: 4, top: 8 }}>
                  <defs>
                    <GlowFilter id="projected-glow" blur={5} opacity={0.45} />
                    <GradientFill id="projected-fill" startColor="var(--brand-primary)" startOpacity={0.18} endOpacity={0} />
                  </defs>
                  <CartesianGrid stroke="var(--border-default)" strokeOpacity={0.4} vertical={false} />
                  <XAxis
                    axisLine={false}
                    dataKey="month"
                    fontFamily="Inter, -apple-system, sans-serif"
                    fontSize={12}
                    fontWeight={600}
                    stroke="var(--text-muted)"
                    style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    fontFamily="JetBrains Mono, monospace"
                    fontSize={12}
                    stroke="var(--text-muted)"
                    tickFormatter={(value: number) => formatCurrency(value, { display: 'compact' })}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Area
                    activeDot={{
                      className: 'chart-active-dot',
                      fill: 'var(--brand-primary)',
                      r: 7,
                      stroke: 'rgba(34, 197, 94, 0.25)',
                      strokeWidth: 5,
                    }}
                    animationDuration={prefersReducedMotion ? 0 : 850}
                    dataKey="projected"
                    dot={{ fill: 'var(--brand-primary)', r: 3.5, stroke: 'var(--brand-primary)' }}
                    filter="url(#projected-glow)"
                    fill="url(#projected-fill)"
                    isAnimationActive={!prefersReducedMotion}
                    name="Monthly spend"
                    stroke="var(--brand-primary)"
                    strokeLinecap="round"
                    strokeWidth={3}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                className="rounded-2xl border px-4 py-3"
                style={{
                  backgroundColor: 'var(--trend-stat-bg)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <p className="label-wide">{trendAverageLabel}</p>
                <p
                  className="mt-2 font-mono text-xl font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {formatCurrency(trendOverview.average, { display: 'summary' })}
                </p>
              </div>
              <div
                className="rounded-2xl border px-4 py-3"
                style={{
                  backgroundColor: 'var(--trend-stat-bg)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <p className="label-wide">Peak month</p>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p
                    className="font-mono text-xl font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {formatCurrency(trendOverview.peak?.projected ?? 0, { display: 'summary' })}
                  </p>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {trendOverview.peak?.tooltipLabel}
                  </span>
                </div>
              </div>
            </div>
            </>
          )}
        </div>

        <div className="card animate-in flex h-full flex-col" style={{ animationDelay: '0.25s' }}>
          <div className="mb-5">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              Category Concentration
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Tap a category to focus the ranking and cancellation insights below.
            </p>
          </div>

          {categoryInsights.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No category data yet"
              description="Spending by category will be charted here."
              compact
              preview={<GhostChartPreview variant="bar-chart" />}
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {visibleCategoryTabs.map((category) => {
                  const isSelected = category.id === selectedCategoryId;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId((current) => (current === category.id ? null : category.id))}
                      aria-pressed={isSelected}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all"
                      style={{
                        backgroundColor: isSelected
                          ? `color-mix(in srgb, ${category.color} 14%, var(--bg-card))`
                          : 'var(--bg-hover)',
                        borderColor: isSelected ? category.color : 'var(--border-default)',
                        boxShadow: isSelected ? `0 0 0 1px ${category.color}33 inset` : 'none',
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: category.color,
                          boxShadow: `0 0 0 2px ${category.color}20`,
                        }}
                      />
                      <span className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {category.name}
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {formatCurrency(category.amount, { display: 'summary' })}
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {formatShare(category.share)}
                      </span>
                    </button>
                  );
                })}
                {hiddenCategoryCount > 0 && (
                  <span
                    className="inline-flex items-center rounded-xl border px-3 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--bg-hover)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    +{hiddenCategoryCount} more
                  </span>
                )}
              </div>
              <div
                className="flex-1 min-h-[18rem]"
                style={{ overflowY: categoryChartScrollable ? 'auto' : 'hidden' }}
              >
                <div style={{ height: categoryChartScrollable ? categoryChartScrollHeight : '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryInsights} layout="vertical" margin={{ left: 0, right: 10, top: 8 }}>
                    <defs>
                      <GlowFilter id="bar-glow" blur={3} opacity={0.25} />
                      {categoryInsights.map((entry, index) => (
                        <linearGradient key={`bar-gradient-${entry.id}`} id={`bar-gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={entry.color} stopOpacity={0.85} />
                          <stop offset="100%" stopColor={lightenColor(entry.color, 0.2)} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid horizontal={false} stroke="var(--border-default)" strokeOpacity={0.3} vertical />
                    <XAxis
                      axisLine={false}
                      fontFamily="JetBrains Mono, monospace"
                      fontSize={12}
                      stroke="var(--text-muted)"
                      tickFormatter={(value: number) => formatCurrency(value, { display: 'compact' })}
                      tickLine={false}
                      type="number"
                    />
                    <YAxis
                      axisLine={false}
                      dataKey="name"
                      fontFamily="Inter, -apple-system, sans-serif"
                      fontSize={12}
                      fontWeight={600}
                      stroke="var(--text-muted)"
                      tickMargin={6}
                      tickFormatter={(value: string) => (value.length > 16 ? `${value.slice(0, 16)}…` : value)}
                      tickLine={false}
                      type="category"
                      width={categoryAxisWidth}
                    />
                    <Tooltip content={<CategoryTooltip />} cursor={false} />
                    <Bar
                      animationDuration={prefersReducedMotion ? 0 : 500}
                      dataKey="amount"
                      filter="url(#bar-glow)"
                      isAnimationActive={!prefersReducedMotion}
                      radius={[0, 8, 8, 0]}
                    >
                      {categoryInsights.map((entry, index) => {
                        const isSelected = resolvedSelectedCategoryId === entry.id;
                        const isDimmed = resolvedSelectedCategoryId !== null && !isSelected;

                        return (
                          <Cell
                            key={entry.id}
                            cursor="pointer"
                            fill={`url(#bar-gradient-${index})`}
                            fillOpacity={isDimmed ? 0.35 : 1}
                            onClick={() =>
                              setSelectedCategoryId((current) => (current === entry.id ? null : entry.id))
                            }
                          />
                        );
                      })}
                    </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Most Expensive {selectedCategory ? selectedCategory.name : activeTab === 'all' ? 'Commitments' : activeTab === 'bill' ? 'Bills' : 'Subscriptions'}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Top active {selectedCategoryLabel} ranked by normalized monthly cost.
              </p>
            </div>
            {selectedCategory && (
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                Filtered
              </span>
            )}
          </div>

          {topItems.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No active items"
              description="Your top spending items will be ranked here."
              compact
              preview={<GhostListPreview variant="ranked-row" count={2} />}
            />
          ) : (
            <div className="space-y-3">
              {topItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl p-3 transition-colors interactive-hover-bg"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                  >
                    {index + 1}
                  </div>
                  <ServiceLogo
                    categoryColor={item.category?.color}
                    categoryName={item.category?.name}
                    itemType={item.item_type}
                    logoUrl={item.logo_url}
                    name={item.name}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.name}
                    </p>
                    <p className="truncate text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {item.category?.name || 'Uncategorized'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(item.monthlyAmount, { display: 'precise' })}/mo
                    </p>
                    <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {formatCurrency(item.amount, { currency: item.currency, display: 'precise' })} {item.billing_cycle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Cancellation Insights
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Track which cancellations created budget room and how recently you made them.
            </p>
          </div>

          {cancelledItems.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No cancellations yet"
              description="Cancelled items and savings will be tracked here."
              compact
              preview={<GhostListPreview variant="cancelled-row" count={1} />}
            />
          ) : (
            <>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--accent-green-muted)' }}>
                  <p className="label-wide" style={{ color: 'var(--accent-green)' }}>
                    RECOVERED / MONTH
                  </p>
                  <p className="mt-2 text-2xl font-bold font-mono" style={{ color: 'var(--accent-green)' }}>
                    {formatCurrency(cancellationInsights.totalSavings, { display: 'summary' })}
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <p className="label-wide">NEW IN LAST 30 DAYS</p>
                  <p className="mt-2 text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(cancellationInsights.recentSavings, { display: 'summary' })}
                  </p>
                  <p className="mt-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {cancellationInsights.recentCount} recent cuts
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <p className="label-wide">BIGGEST CUT</p>
                  <p className="mt-2 truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {cancellationInsights.largestCut?.name || 'N/A'}
                  </p>
                  <p className="mt-1 text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                    {cancellationInsights.largestCut ? `+${formatCurrency(cancellationInsights.largestCut.monthlyAmount, { display: 'precise' })}/mo` : '$0'}
                  </p>
                </div>
              </div>

              <div className="max-h-80 space-y-3 overflow-y-auto">
                {cancelledItems.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{ backgroundColor: 'var(--bg-hover)' }}
                  >
                    <ServiceLogo
                      categoryColor={item.category?.color}
                      categoryName={item.category?.name}
                      className="opacity-70"
                      itemType={item.item_type}
                      logoUrl={item.logo_url}
                      name={item.name}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                        {item.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {getCancelledInsightDate(item)
                          ? `Ended ${formatDisplayDate(getCancelledInsightDate(item)!)}`
                          : 'Ended date unavailable'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold font-mono" style={{ color: 'var(--accent-green)' }}>
                        +{formatCurrency(item.monthlyAmount, { display: 'precise' })}/mo
                      </p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {item.category?.name || 'Uncategorized'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(Analytics);
