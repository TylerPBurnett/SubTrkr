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
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
            Monthly Average
          </p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-neutral-900 dark:text-white">
              {formatCurrency(monthlySpending)}
            </p>
            <div className={`flex items-center gap-1 text-sm mb-1 ${
              trend.direction === 'up' ? 'text-red-500' :
              trend.direction === 'down' ? 'text-green-500' :
              'text-neutral-400'
            }`}>
              {trend.direction === 'up' && <TrendingUp className="w-4 h-4" />}
              {trend.direction === 'down' && <TrendingDown className="w-4 h-4" />}
              {trend.direction === 'flat' && <Minus className="w-4 h-4" />}
              <span>{trend.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="card">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
            Yearly Total
          </p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">
            {formatCurrency(yearlySpending)}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
            Active Subscriptions
          </p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">
            {subscriptions.filter(s => s.is_active === 1).length}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
            Monthly Spending Trend
          </h3>
          
          {monthlySpending === 0 ? (
            <div className="h-64 flex items-center justify-center text-neutral-400">
              No spending data to display
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#a3a3a3"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#a3a3a3"
                    fontSize={12}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Spending']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#22c55e" 
                    strokeWidth={3}
                    dot={{ fill: '#22c55e', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
            Spending by Category
          </h3>
          
          {categoryChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-neutral-400">
              No category data to display
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
                  <XAxis 
                    type="number"
                    stroke="#a3a3a3"
                    fontSize={12}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    stroke="#a3a3a3"
                    fontSize={12}
                    width={100}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value}/mo`, 'Spending']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
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
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Most Expensive Subscriptions
        </h3>
        
        {topSubscriptions.length === 0 ? (
          <div className="text-center py-8 text-neutral-400">
            No active subscriptions
          </div>
        ) : (
          <div className="space-y-3">
            {topSubscriptions.map((sub, index) => (
              <div 
                key={sub.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-sm font-bold text-neutral-500">
                  {index + 1}
                </div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: sub.category?.color || '#6b7280' }}
                >
                  {sub.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900 dark:text-white">{sub.name}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {sub.category?.name || 'Uncategorized'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {formatCurrency(sub.monthlyAmount)}/mo
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
