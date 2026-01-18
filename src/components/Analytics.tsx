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
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SubscriptionWithCategory, SpendingByCategory } from '../types';
import { 
  calculateMonthlySpending,
  calculateYearlySpending,
  getSpendingByCategory 
} from '../services/database';

interface AnalyticsProps {
  subscriptions: SubscriptionWithCategory[];
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Analytics({ subscriptions }: AnalyticsProps) {
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [yearlySpending, setYearlySpending] = useState(0);
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingByCategory[]>([]);

  useEffect(() => {
    async function loadStats() {
      const [monthly, yearly, byCategory] = await Promise.all([
        calculateMonthlySpending(subscriptions),
        calculateYearlySpending(subscriptions),
        getSpendingByCategory(subscriptions)
      ]);
      setMonthlySpending(monthly);
      setYearlySpending(yearly);
      setSpendingByCategory(byCategory);
    }
    loadStats();
  }, [subscriptions]);

  // Generate mock monthly trend data (last 6 months)
  const monthlyTrendData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      // For demo: simulate some variance in spending
      const variance = 1 + (Math.random() - 0.5) * 0.2;
      months.push({
        month: monthName,
        amount: Math.round(monthlySpending * variance),
      });
    }
    
    return months;
  }, [monthlySpending]);

  // Top subscriptions by cost (monthly normalized)
  const topSubscriptions = useMemo(() => {
    return subscriptions
      .filter(s => s.is_active === 1)
      .map(sub => {
        let monthlyAmount: number;
        switch (sub.billing_cycle) {
          case 'weekly': monthlyAmount = sub.amount * 52 / 12; break;
          case 'monthly': monthlyAmount = sub.amount; break;
          case 'quarterly': monthlyAmount = sub.amount / 3; break;
          case 'yearly': monthlyAmount = sub.amount / 12; break;
          default: monthlyAmount = sub.amount;
        }
        return { ...sub, monthlyAmount };
      })
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
      .slice(0, 5);
  }, [subscriptions]);

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

  return (
    <div className="space-y-6">
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
            Active Subscriptions
          </p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {subscriptions.filter(s => s.is_active === 1).length}
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

      {/* Top Subscriptions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Most Expensive Subscriptions
        </h3>
        
        {topSubscriptions.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No active subscriptions
          </div>
        ) : (
          <div className="space-y-3">
            {topSubscriptions.map((sub, index) => (
              <div 
                key={sub.id}
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
                  style={{ backgroundColor: sub.category?.color || '#6b7280' }}
                >
                  {sub.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{sub.name}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {sub.category?.name || 'Uncategorized'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(sub.monthlyAmount)}/mo
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(sub.amount, sub.currency)} {sub.billing_cycle}
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
