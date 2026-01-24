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
import type { ItemWithCategory, SpendingByCategory, ItemType } from '../types';
import { 
  calculateMonthlySpending,
  calculateYearlySpending,
  getSpendingByCategory 
} from '../services/database';
import { parseLocalDate } from '../utils/dates';

type FilterTab = 'all' | ItemType;

interface AnalyticsProps {
  items: ItemWithCategory[];
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

export default function Analytics({ items }: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [yearlySpending, setYearlySpending] = useState(0);
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingByCategory[]>([]);

  // Filter items by type
  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items;
    return items.filter(item => item.item_type === activeTab);
  }, [items, activeTab]);

  useEffect(() => {
    async function loadStats() {
      const [monthly, yearly, byCategory] = await Promise.all([
        calculateMonthlySpending(filteredItems),
        calculateYearlySpending(filteredItems),
        getSpendingByCategory(filteredItems)
      ]);
      setMonthlySpending(monthly);
      setYearlySpending(yearly);
      setSpendingByCategory(byCategory);
    }
    loadStats();
  }, [filteredItems]);

  // Monthly trend data (last 6 months) derived from item start dates
  const monthlyTrendData = useMemo(() => {
    const months: { month: string; amount: number }[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });

      const amount = filteredItems.reduce((total, item) => {
        if (!item.is_active) return total;
        const startDate = parseLocalDate(item.start_date);
        if (startDate > monthEnd) return total;
        return total + getMonthlyAmount(item);
      }, 0);

      months.push({ month: monthName, amount: Math.round(amount) });
    }
    
    return months;
  }, [filteredItems]);

  // Top items by cost (monthly normalized)
  const topItems = useMemo(() => {
    return filteredItems
      .filter(s => s.is_active)
      .map((item) => ({ ...item, monthlyAmount: getMonthlyAmount(item) }))
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
      .slice(0, 5);
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            Monthly Average
          </p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(monthlySpending)}
            </p>
            <div className="flex items-center gap-1 text-sm mb-1" style={{
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

        <div className="card">
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            Yearly Total
          </p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(yearlySpending)}
          </p>
        </div>

        <div className="card">
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            Active {itemTypeLabel}
          </p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {filteredItems.filter(s => s.is_active).length}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
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
                  />
                  <YAxis 
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Spending']}
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-elevated)'
                    }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
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
        <div className="card">
          <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
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
                    tickFormatter={(value) => `$${value}`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    width={100}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value}/mo`, 'Spending']}
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-elevated)'
                    }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
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
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: item.category?.color || '#6b7280' }}
                >
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {item.category?.name || 'Uncategorized'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(item.monthlyAmount)}/mo
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(item.amount, item.currency)} {item.billing_cycle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
