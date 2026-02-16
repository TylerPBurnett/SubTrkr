import { useState, useEffect, useMemo, memo } from 'react';
import {
  TrendingUp,
  Calendar,
  CreditCard,
  Receipt,
  AlertCircle,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { Category, ItemWithCategory } from '../types';
import {
  calculateMonthlySpending,
  calculateYearlySpending,
  getSpendingByCategory,
  getUpcomingItems
} from '../services/database';
import { formatShortDate, getDaysUntil } from '../utils/dates';
import ServiceLogo from './ui/ServiceLogo';
import SegmentedControl from './ui/SegmentedControl';

interface DashboardProps {
  items: ItemWithCategory[];
  categories: Category[];
  onEdit: (item: ItemWithCategory) => void;
}

type FilterTab = 'all' | 'bill' | 'subscription';

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function Dashboard({ items, categories, onEdit }: DashboardProps) {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [upcomingItems, setUpcomingItems] = useState<ItemWithCategory[]>([]);

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

  const spendingByCategory = useMemo(
    () => getSpendingByCategory(items, categories, typeFilter),
    [items, categories, typeFilter]
  );

  // Load upcoming items (async query)
  useEffect(() => {
    getUpcomingItems(items, 7, typeFilter).then(setUpcomingItems);
  }, [items, typeFilter]);

  // Filter items by type for counts
  const filteredItems = typeFilter ? items.filter(i => i.item_type === typeFilter) : items;
  const activeCount = filteredItems.filter(s => s.status === 'active').length;
  const pausedCount = filteredItems.filter(s => s.status === 'paused').length;
  const cancelledCount = filteredItems.filter(s => s.status === 'cancelled').length;

  const chartData = spendingByCategory.map(item => ({
    name: item.category.name,
    value: item.total,
    color: item.category.color
  }));

  // Tab config
  const tabs: { id: FilterTab; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All' },
    { id: 'bill', label: 'Bills', icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'subscription', label: 'Subscriptions', icon: <CreditCard className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <SegmentedControl tabs={tabs} activeTab={filterTab} onTabChange={setFilterTab} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Spending Card */}
        <div className="stagger-item card" style={{ borderLeft: '4px solid var(--brand-primary)' }}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="label">MONTHLY SPENDING</p>
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
          </div>
        </div>

        {/* Yearly Spending Card */}
        <div className="stagger-item card" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="label">YEARLY SPENDING</p>
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
          </div>
        </div>

        {/* Active Items Card */}
        <div className="stagger-item card" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
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
        <div className="stagger-item card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
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
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No payments due in the next 7 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingItems.slice(0, 5).map((item, index) => {
                const isPaused = item.status === 'paused' && item.paused_until;
                const targetDate = isPaused ? item.paused_until! : item.next_billing_date;
                const daysUntil = getDaysUntil(targetDate);

                return (
                  <button
                    key={item.id}
                    onClick={() => onEdit(item)}
                    className="stagger-item w-full flex items-center gap-4 p-3 rounded-xl transition-all group interactive-hover-bg hover:scale-101"
                    style={{
                      animationDelay: `${index * 0.05}s`
                    }}
                  >
                    {isPaused && (
                      <div className="absolute top-2 left-2">
                        <RotateCcw className="w-4 h-4" style={{ color: 'var(--accent-amber)' }} />
                      </div>
                    )}
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
                        {isPaused ? (
                          <>Resumes on {formatShortDate(targetDate)}</>
                        ) : (
                          <>{formatCurrency(item.amount, item.currency)} · {item.billing_cycle}</>
                        )}
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
                        {isPaused ? 'Auto-resume' : formatShortDate(item.next_billing_date)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Spending by Category */}
        <div className="card">
          <h3 className="text-xl mb-4" style={{ color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Spending by Category
          </h3>
          
          {chartData.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No spending data yet</p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="w-40 h-40 relative">
                <PieChart width={160} height={160}>
                  <Pie
                    data={chartData}
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
                    className="chart-pie-sector"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), '']}
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '10px',
                      boxShadow: 'var(--shadow-elevated)',
                      padding: '6px 10px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontFamily: 'Inter, -apple-system, sans-serif', fontWeight: 600, fontSize: '11px', marginBottom: '2px' }}
                    itemStyle={{ color: 'var(--text-primary)', padding: 0 }}
                    separator=""
                  />
                  {/* Center label */}
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" fill="var(--text-muted)" fontSize={10} fontFamily="Inter, -apple-system, sans-serif" fontWeight={600}>
                    MONTHLY
                  </text>
                  <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" fill="var(--text-primary)" fontSize={14} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
                    {formatCurrency(monthlySpending)}
                  </text>
                </PieChart>
              </div>
              
              <div className="flex-1 space-y-2">
                {spendingByCategory.slice(0, 5).map(item => (
                  <div key={item.category.id} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.category.color }}
                    />
                    <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {item.category.name}
                    </span>
                    <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(Dashboard);
