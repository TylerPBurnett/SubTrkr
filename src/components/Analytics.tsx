import { useEffect, useState, useMemo, memo } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Receipt, CreditCard } from 'lucide-react';
import type { Category, ItemStatus, ItemWithCategory, ItemType, Payment, StatusHistory } from '@/types';
import {
  calculateMonthlySpending,
  calculateYearlySpending,
  calculateMonthlySavings,
  getSpendingByCategory,
  getPayments,
  getAllStatusHistory,
} from '../services/database';
import { parseLocalDate, formatDisplayDate } from '../utils/dates';
import {
  getResolvedStatusHistoryAction,
  getResolvedStatusHistoryEffectiveDate,
} from '../utils/statusHistory';
import ServiceLogo from './ui/ServiceLogo';
import { GlowFilter, GradientFill, lightenColor } from './ui/ChartEffects';
import SegmentedControl from './ui/SegmentedControl';

type FilterTab = 'all' | ItemType;

interface AnalyticsProps {
  items: ItemWithCategory[];
  categories: Category[];
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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

type StatusTransition = {
  status: ItemStatus;
  effectiveDate: Date;
  action: string | null;
  recordedAt: Date | null;
};

function parseDateValue(value: string | null | undefined): Date | null {
  if (!value) return null;

  const parsed = value.includes('T') ? new Date(value) : parseLocalDate(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeToStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isOnOrBeforeDay(date: Date, comparedTo: Date): boolean {
  return normalizeToStartOfDay(date).getTime() <= normalizeToStartOfDay(comparedTo).getTime();
}

function getMonthKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
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
        status: entry.status,
        effectiveDate: normalizeToStartOfDay(effectiveDate),
        action: getResolvedStatusHistoryAction(entry),
        recordedAt: parseDateValue(entry.changed_at),
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

function Analytics({ items, categories }: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusHistoryByItem, setStatusHistoryByItem] = useState<Record<string, StatusHistory[]>>({});

  useEffect(() => {
    let cancelled = false;

    if (items.length === 0) {
      setPayments([]);
      setStatusHistoryByItem({});
      return () => {
        cancelled = true;
      };
    }

    const itemIds = new Set(items.map((item) => item.id));

    Promise.all([getPayments(), getAllStatusHistory()])
      .then(([paymentsData, historyData]) => {
        if (cancelled) return;

        setPayments(paymentsData.filter((payment) => itemIds.has(payment.item_id)));

        const groupedHistory = historyData.reduce<Record<string, StatusHistory[]>>((acc, entry) => {
          if (!itemIds.has(entry.item_id)) return acc;
          (acc[entry.item_id] ||= []).push(entry);
          return acc;
        }, {});

        setStatusHistoryByItem(groupedHistory);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load analytics support data:', error);
          setPayments([]);
          setStatusHistoryByItem({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [items]);

  // Filter items by type
  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items;
    return items.filter(item => item.item_type === activeTab);
  }, [items, activeTab]);

  // Compute stats with useMemo (pure synchronous functions)
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
    [filteredItems, categories, activeTab]
  );

  // Monthly trend data (last 6 months) - includes historical data for cancelled items
  const monthlyTrendData = useMemo(() => {
    const months: { month: string; amount: number }[] = [];
    const now = new Date();
    const paymentIndex = payments.reduce<Record<string, Record<string, number>>>((acc, payment) => {
      const paidAt = parseDateValue(payment.paid_at);
      if (!paidAt) return acc;

      const monthKey = getMonthKey(paidAt);
      (acc[payment.item_id] ||= {});
      acc[payment.item_id][monthKey] = (acc[payment.item_id][monthKey] || 0) + payment.amount;
      return acc;
    }, {});

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const { start: monthStart, endExclusive: monthEndExclusive } = getMonthRange(monthDate);
      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });
      const monthKey = getMonthKey(monthStart);

      const amount = filteredItems.reduce((total, item) => {
        const paidAmount = paymentIndex[item.id]?.[monthKey];
        if (typeof paidAmount === 'number') {
          return total + paidAmount;
        }

        return wasItemActive(
          item,
          monthStart,
          monthEndExclusive,
          statusHistoryByItem[item.id] ?? []
        )
          ? total + getMonthlyAmount(item)
          : total;
      }, 0);

      months.push({ month: monthName, amount: Math.round(amount) });
    }

    return months;
  }, [filteredItems, payments, statusHistoryByItem]);

  // Top items by cost (monthly normalized) - active only
  const topItems = useMemo(() => {
    return filteredItems
      .filter(s => s.status === 'active')
      .map((item) => ({ ...item, monthlyAmount: getMonthlyAmount(item) }))
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
      .slice(0, 5);
  }, [filteredItems]);

  // Cancelled items for insights
  const cancelledItems = useMemo(() => {
    return filteredItems
      .filter(s => s.status === 'cancelled' || s.status === 'archived')
      .map((item) => ({ ...item, monthlyAmount: getMonthlyAmount(item) }))
      .sort((a, b) => {
        const insightDateA = getCancelledInsightDate(a);
        const insightDateB = getCancelledInsightDate(b);
        const dateA = insightDateA ? parseLocalDate(insightDateA) : new Date(0);
        const dateB = insightDateB ? parseLocalDate(insightDateB) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [filteredItems]);

  // Calculate trend (compare current to previous month)
  const trend = useMemo(() => {
    if (monthlyTrendData.length < 2) return { direction: 'flat', percentage: 0 };
    const current = monthlyTrendData[monthlyTrendData.length - 1].amount;
    const previous = monthlyTrendData[monthlyTrendData.length - 2].amount;
    if (previous === 0) return { direction: 'flat', percentage: 0 };
    
    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 2 ? 'up' : change < -2 ? 'down' : 'flat',
      percentage: Math.abs(change),
    };
  }, [monthlyTrendData]);

  const categoryChartData = spendingByCategory.map(item => ({
    name: item.category.name,
    amount: Math.round(item.total),
    color: item.category.color,
  }));
  const hasTrendData = monthlyTrendData.some((entry) => entry.amount > 0);

  const tabs: { id: FilterTab; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All' },
    { id: 'bill', label: 'Bills', icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'subscription', label: 'Subscriptions', icon: <CreditCard className="w-3.5 h-3.5" /> },
  ];

  const itemTypeLabel = activeTab === 'bill' ? 'Bills' : activeTab === 'subscription' ? 'Subscriptions' : 'Items';

  return (
    <div className="space-y-6">
      <SegmentedControl tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stagger-item card">
          <p className="label mb-2">MONTHLY AVERAGE</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(monthlySpending)}
            </p>
            <div className="flex items-center gap-1 text-sm mb-1 font-mono" style={{
              color: trend.direction === 'up' ? 'var(--accent-red)' :
                     trend.direction === 'down' ? 'var(--accent-emerald)' :
                     'var(--text-muted)'
            }}>
              {trend.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : null}
              {trend.direction === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
              {trend.direction === 'flat' ? <Minus className="w-4 h-4" /> : null}
              <span>{trend.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="stagger-item card">
          <p className="label mb-2">MONTHLY SAVINGS</p>
          <p className="text-3xl font-bold font-mono" style={{ color: 'var(--accent-green)' }}>
            {formatCurrency(monthlySavings)}
          </p>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
            {cancelledItems.length} cancelled
          </p>
        </div>

        <div className="stagger-item card">
          <p className="label mb-2">YEARLY TOTAL</p>
          <p className="text-3xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(yearlySpending)}
          </p>
        </div>

        <div className="stagger-item card">
          <p className="label mb-2">ACTIVE {itemTypeLabel.toUpperCase()}</p>
          <p className="text-3xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
            {filteredItems.filter(s => s.status === 'active').length}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="card animate-in" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            Monthly Spending Trend
          </h3>
          
          {!hasTrendData ? (
            <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              No spending data to display
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData}>
                  <defs>
                    <GlowFilter id="line-glow" blur={5} opacity={0.5} />
                    <GradientFill id="area-fill" startColor="var(--brand-primary)" startOpacity={0.3} endOpacity={0} />
                  </defs>
                  <CartesianGrid stroke="var(--border-default)" strokeOpacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    fontFamily="Inter, -apple-system, sans-serif"
                    fontWeight={600}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    fontFamily="JetBrains Mono, monospace"
                    tickFormatter={(value) => `$${value}`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(value) => [`$${value}`, '']}
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '10px',
                      boxShadow: 'var(--shadow-elevated)',
                      padding: '6px 10px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '13px',
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontFamily: 'Inter, -apple-system, sans-serif', fontWeight: 600, fontSize: '11px', marginBottom: '2px' }}
                    itemStyle={{ color: 'var(--text-primary)', padding: 0 }}
                    separator=""
                  />
                  <Area
                    type="bump"
                    dataKey="amount"
                    fill="url(#area-fill)"
                    stroke="none"
                    tooltipType="none"
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  />
                  {/* Glow layer — no dots, just the blurred stroke */}
                  <Line
                    type="bump"
                    dataKey="amount"
                    stroke="var(--brand-primary)"
                    strokeWidth={3}
                    strokeLinecap="round"
                    dot={false}
                    activeDot={false}
                    filter="url(#line-glow)"
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                    tooltipType="none"
                  />
                  {/* Main line with dots — no filter */}
                  <Line
                    type="bump"
                    dataKey="amount"
                    stroke="var(--brand-primary)"
                    strokeWidth={3}
                    strokeLinecap="round"
                    dot={{ fill: 'var(--brand-primary)', stroke: 'var(--brand-primary)', r: 4 }}
                    activeDot={{
                      r: 8,
                      fill: 'var(--brand-primary)',
                      stroke: 'rgba(34, 197, 94, 0.25)',
                      strokeWidth: 6,
                      className: 'chart-active-dot',
                    }}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="card animate-in" style={{ animationDelay: '0.35s' }}>
          <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            Spending by Category
          </h3>
          
          {categoryChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              No category data to display
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} layout="vertical">
                  <defs>
                    <GlowFilter id="bar-glow" blur={3} opacity={0.25} />
                    {categoryChartData.map((entry, index) => (
                      <linearGradient key={`bar-grad-${index}`} id={`bar-gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={entry.color} stopOpacity={0.85} />
                        <stop offset="100%" stopColor={lightenColor(entry.color, 0.2)} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="var(--border-default)" strokeOpacity={0.3} horizontal={false} vertical />
                  <XAxis
                    type="number"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    fontFamily="JetBrains Mono, monospace"
                    tickFormatter={(value) => `$${value}`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    fontFamily="Inter, -apple-system, sans-serif"
                    fontWeight={600}
                    width={100}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(value) => [`$${value}/mo`, '']}
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '10px',
                      boxShadow: 'var(--shadow-elevated)',
                      padding: '6px 10px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '13px',
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontFamily: 'Inter, -apple-system, sans-serif', fontWeight: 600, fontSize: '11px', marginBottom: '2px' }}
                    itemStyle={{ color: 'var(--text-primary)', padding: 0 }}
                    separator=""
                  />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]} filter="url(#bar-glow)" className="chart-bar-enter">
                    {categoryChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#bar-gradient-${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top Items & Cancellation Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Items */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Most Expensive {itemTypeLabel}
          </h3>

          {topItems.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No active {itemTypeLabel.toLowerCase()}
            </div>
          ) : (
            <div className="space-y-3">
              {topItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 rounded-xl transition-colors interactive-hover-bg"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                  >
                    {index + 1}
                  </div>
                  <ServiceLogo
                    logoUrl={item.logo_url}
                    name={item.name}
                    size="md"
                    itemType={item.item_type}
                    categoryName={item.category?.name}
                    categoryColor={item.category?.color}
                  />
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {item.category?.name || 'Uncategorized'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(item.monthlyAmount)}/mo
                    </p>
                    <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {formatCurrency(item.amount, item.currency)} {item.billing_cycle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cancellation Insights */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Cancellation History
          </h3>

          {cancelledItems.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No cancelled {itemTypeLabel.toLowerCase()} yet
            </div>
          ) : (
            <>
              <div
                className="mb-4 p-4 rounded-xl"
                style={{ backgroundColor: 'var(--accent-green-muted)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="label" style={{ color: 'var(--accent-green)' }}>
                      TOTAL MONTHLY SAVINGS
                    </p>
                    <p className="text-2xl font-bold font-mono mt-1" style={{ color: 'var(--accent-green)' }}>
                      {formatCurrency(monthlySavings)}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8" style={{ color: 'var(--accent-green)' }} />
                </div>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {cancelledItems.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)' }}
                  >
                    <ServiceLogo
                      logoUrl={item.logo_url}
                      name={item.name}
                      size="md"
                      itemType={item.item_type}
                      categoryName={item.category?.name}
                      categoryColor={item.category?.color}
                      className="opacity-70"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {getCancelledInsightDate(item)
                          ? `Ended ${formatDisplayDate(getCancelledInsightDate(item)!)}`
                          : 'Ended date unavailable'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold font-mono text-sm" style={{ color: 'var(--accent-green)' }}>
                        +{formatCurrency(item.monthlyAmount)}/mo
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
