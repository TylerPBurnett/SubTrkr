import { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
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
import type { Category, ItemWithCategory, SpendingByCategory, ItemType } from '../types';
import {
  calculateMonthlySpending,
  calculateYearlySpending,
  calculateMonthlySavings,
  getSpendingByCategory
} from '../services/database';
import { parseLocalDate, formatDisplayDate } from '../utils/dates';
import ServiceLogo from './ui/ServiceLogo';

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

export default function Analytics({ items, categories }: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [yearlySpending, setYearlySpending] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingByCategory[]>([]);

  // Filter items by type
  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items;
    return items.filter(item => item.item_type === activeTab);
  }, [items, activeTab]);

  useEffect(() => {
    async function loadStats() {
      const [monthly, yearly, savings, byCategory] = await Promise.all([
        calculateMonthlySpending(filteredItems),
        calculateYearlySpending(filteredItems),
        calculateMonthlySavings(filteredItems),
        Promise.resolve(
          getSpendingByCategory(
            filteredItems,
            categories,
            activeTab === 'all' ? undefined : activeTab
          )
        ),
      ]);
      setMonthlySpending(monthly);
      setYearlySpending(yearly);
      setMonthlySavings(savings);
      setSpendingByCategory(byCategory);
    }
    loadStats();
  }, [filteredItems, categories, activeTab]);

  // Monthly trend data (last 6 months) - includes historical data for cancelled items
  const monthlyTrendData = useMemo(() => {
    const months: { month: string; amount: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });

      const amount = filteredItems.reduce((total, item) => {
        const startDate = parseLocalDate(item.start_date);

        // Skip if item hadn't started yet
        if (startDate > monthEnd) return total;

        // For cancelled/archived items, check if they were active during this month
        if (item.status === 'cancelled' || item.status === 'archived') {
          if (item.cancellation_date) {
            const cancelDate = parseLocalDate(item.cancellation_date);
            // If cancelled before the month started, don't include
            if (cancelDate < monthStart) return total;
          }
        }

        // Item was active during this month period
        return total + getMonthlyAmount(item);
      }, 0);

      months.push({ month: monthName, amount: Math.round(amount) });
    }

    return months;
  }, [filteredItems]);

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
        // Sort by cancellation date, most recent first
        const dateA = a.cancelled_at ? new Date(a.cancelled_at) : new Date(0);
        const dateB = b.cancelled_at ? new Date(b.cancelled_at) : new Date(0);
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

  const tabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: null },
    { key: 'bill', label: 'Bills', icon: <Receipt className="w-4 h-4" /> },
    { key: 'subscription', label: 'Subscriptions', icon: <CreditCard className="w-4 h-4" /> },
  ];

  const itemTypeLabel = activeTab === 'bill' ? 'Bills' : activeTab === 'subscription' ? 'Subscriptions' : 'Items';

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div 
        className="inline-flex rounded-xl p-1 gap-1"
        style={{ backgroundColor: 'var(--bg-hover)' }}
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === tab.key ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.key ? 'var(--shadow-card)' : 'none',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

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
              {trend.direction === 'up' && <TrendingUp className="w-4 h-4" />}
              {trend.direction === 'down' && <TrendingDown className="w-4 h-4" />}
              {trend.direction === 'flat' && <Minus className="w-4 h-4" />}
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
          
          {monthlySpending === 0 ? (
            <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              No spending data to display
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                  <XAxis
                    dataKey="month"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    fontFamily="Archivo, sans-serif"
                    fontWeight={600}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    fontFamily="JetBrains Mono, monospace"
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    formatter={(value) => [`$${value}`, 'Spending']}
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '2px solid var(--border-default)',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-elevated)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontFamily: 'Archivo, sans-serif', fontWeight: 600 }}
                    itemStyle={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="var(--brand-primary)" 
                    strokeWidth={3}
                    dot={{ fill: 'var(--brand-primary)', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    fontFamily="JetBrains Mono, monospace"
                    tickFormatter={(value) => `$${value}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    fontFamily="Archivo, sans-serif"
                    fontWeight={600}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value) => [`$${value}/mo`, 'Spending']}
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '2px solid var(--border-default)',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-elevated)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontFamily: 'Archivo, sans-serif', fontWeight: 600 }}
                    itemStyle={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
                  className="flex items-center gap-4 p-3 rounded-xl transition-colors"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                        Cancelled {item.cancelled_at && formatDisplayDate(item.cancelled_at)}
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
