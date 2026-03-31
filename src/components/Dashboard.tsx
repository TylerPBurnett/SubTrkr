import { useState, useMemo, memo } from 'react';
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
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Category, ItemWithCategory, ItemType } from '../types';
import {
  calculateMonthlySpending,
  calculateYearlySpending,
  getSpendingByCategory,
  getUpcomingItems
} from '../services/database';
import { formatShortDate, getDaysUntil } from '../utils/dates';
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

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Estimate last month's monthly spending by excluding items that started after
 * the beginning of the current month (i.e., items that didn't exist last month).
 */
function calculatePreviousMonthSpending(items: ItemWithCategory[], type?: ItemType): number {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = items.filter(
    (item) =>
      item.status === 'active' &&
      (!type || item.item_type === type) &&
      new Date(item.start_date) < startOfThisMonth
  );

  return filtered.reduce((total, item) => {
    let monthlyAmount = item.amount;
    switch (item.billing_cycle) {
      case 'weekly': monthlyAmount = (item.amount * 52) / 12; break;
      case 'quarterly': monthlyAmount = item.amount / 3; break;
      case 'yearly': monthlyAmount = item.amount / 12; break;
    }
    return total + monthlyAmount;
  }, 0);
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return null; // no baseline to compare

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

type DashboardCategoryEntry = { color: string; id: string; name: string; value: number; share: number };

function DashboardCategoryTooltip({ active, payload }: { active?: boolean; payload?: { payload: DashboardCategoryEntry }[] }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{ alignItems: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '10px', boxShadow: 'var(--shadow-elevated)', display: 'flex', gap: '8px', padding: '6px 10px' }}>
      <span style={{ backgroundColor: data.color, borderRadius: '50%', boxShadow: `0 0 0 2px ${data.color}20`, flexShrink: 0, height: '6px', width: '6px' }} />
      <span style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '12px', fontWeight: 600 }}>{data.name}</span>
      <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 700 }}>{formatCurrency(data.value)}</span>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>{Math.round(data.share * 100)}%</span>
    </div>
  );
}

function Dashboard({ items, categories, onEdit, onViewAll, onAddNew }: DashboardProps) {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  // Get the type filter for database queries
  const typeFilter = filterTab === 'all' ? undefined : filterTab;

  // Compute stats with useMemo (these are pure synchronous functions)
  const monthlySpending = useMemo(
    () => calculateMonthlySpending(items, typeFilter),
    [items, typeFilter]
  );

  const yearlySpending = useMemo(
    () => calculateYearlySpending(items, typeFilter),
    [items, typeFilter]
  );

  const prevMonthlySpending = useMemo(
    () => calculatePreviousMonthSpending(items, typeFilter),
    [items, typeFilter]
  );

  const prevYearlySpending = prevMonthlySpending * 12;

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

  const dashboardCategoryData = useMemo(() => {
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

    if (withShare.length <= 5) return withShare;

    const visible = withShare.slice(0, 4);
    const otherTotal = withShare.slice(4).reduce((sum, item) => sum + item.value, 0);

    return [
      ...visible,
      {
        id: 'other',
        name: 'Other',
        value: otherTotal,
        color: 'var(--accent-gray)',
        share: total === 0 ? 0 : otherTotal / total,
      },
    ];
  }, [spendingByCategory]);

  const topCategory = dashboardCategoryData[0] ?? null;

  // Tab config
  const tabs: { id: FilterTab; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All' },
    { id: 'bill', label: 'Bills', icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'subscription', label: 'Subscriptions', icon: <CreditCard className="w-3.5 h-3.5" /> },
  ];

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
        {/* Monthly Spending Card */}
        <div className="stagger-item card">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="label">PROJECTED MONTHLY</p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--brand-muted)' }}>
                <TrendingUp className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
              </div>
            </div>
            <h1 className="font-mono" style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 650,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {formatCurrency(monthlySpending)}
            </h1>
            <TrendBadge current={monthlySpending} previous={prevMonthlySpending} />
          </div>
        </div>

        {/* Yearly Spending Card */}
        <div className="stagger-item card">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="label">YEARLY RUN RATE</p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-purple-muted)' }}>
                <Calendar className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
              </div>
            </div>
            <h1 className="font-mono" style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 650,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {formatCurrency(yearlySpending)}
            </h1>
            <TrendBadge current={yearlySpending} previous={prevYearlySpending} />
          </div>
        </div>

        {/* Active Items Card */}
        <div className="stagger-item card">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="label">
                {filterTab === 'bill' ? 'ACTIVE BILLS' : filterTab === 'subscription' ? 'ACTIVE SUBSCRIPTIONS' : 'ACTIVE ITEMS'}
              </p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-blue-muted)' }}>
                {filterTab === 'bill' ? <Receipt className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} /> : <CreditCard className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />}
              </div>
            </div>
            <h1 className="font-mono" style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 650,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {activeCount}
            </h1>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {pausedCount > 0 && `${pausedCount} paused`}
              {pausedCount > 0 && cancelledCount > 0 && ' / '}
              {cancelledCount > 0 && `${cancelledCount} cancelled`}
            </p>
          </div>
        </div>

        {/* Due This Week Card */}
        <div className="stagger-item card">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="label">DUE THIS WEEK</p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-amber-muted)' }}>
                <AlertCircle className="w-5 h-5" style={{ color: 'var(--accent-amber)' }} />
              </div>
            </div>
            <h1 className="font-mono" style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 650,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {upcomingItems.length}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Items */}
        <div className="card">
          <h3 className="text-xl mb-4" style={{ color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.02em' }}>
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
                        {formatCurrency(item.amount, item.currency)} · {item.billing_cycle}
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
          <h3 className="text-xl mb-4" style={{ color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.02em' }}>
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
            <div className="flex items-center gap-6">
              <div className="w-40 h-40 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      cornerRadius={4}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={300}
                      animationEasing="ease-out"
                    >
                      {dashboardCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DashboardCategoryTooltip />} />
                    {/* Center label */}
                    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" fill="var(--text-muted)" fontSize={10} fontFamily="Inter, -apple-system, sans-serif" fontWeight={600}>
                      RUN RATE
                    </text>
                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" fill="var(--text-primary)" fontSize={14} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
                      {formatCurrency(monthlySpending)}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex-1 space-y-2">
                {dashboardCategoryData.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: item.color,
                        boxShadow: `0 0 0 2px ${item.color}20`,
                      }}
                    />
                    <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {item.name}
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(item.value)}
                      </p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {Math.round(item.share * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
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
