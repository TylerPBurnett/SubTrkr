import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  CreditCard,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { SubscriptionWithCategory, SpendingByCategory } from '../types';
import { 
  calculateMonthlySpending, 
  calculateYearlySpending,
  getSpendingByCategory,
  getUpcomingRenewals 
} from '../services/database';

interface DashboardProps {
  subscriptions: SubscriptionWithCategory[];
  onEdit: (subscription: SubscriptionWithCategory) => void;
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Dashboard({ subscriptions, onEdit }: DashboardProps) {
  const stats = useMemo(async () => {
    const [monthly, yearly, byCategory, upcoming] = await Promise.all([
      calculateMonthlySpending(subscriptions),
      calculateYearlySpending(subscriptions),
      getSpendingByCategory(subscriptions),
      getUpcomingRenewals(subscriptions, 7)
    ]);
    return { monthly, yearly, byCategory, upcoming };
  }, [subscriptions]);

  const [monthlySpending, setMonthlySpending] = useState(0);
  const [yearlySpending, setYearlySpending] = useState(0);
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingByCategory[]>([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState<SubscriptionWithCategory[]>([]);

  useEffect(() => {
    stats.then(data => {
      setMonthlySpending(data.monthly);
      setYearlySpending(data.yearly);
      setSpendingByCategory(data.byCategory);
      setUpcomingRenewals(data.upcoming);
    });
  }, [stats]);

  const activeCount = subscriptions.filter(s => s.is_active === 1).length;
  const totalCount = subscriptions.length;

  const chartData = spendingByCategory.map(item => ({
    name: item.category.name,
    value: item.total,
    color: item.category.color
  }));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Monthly Spending</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(monthlySpending)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand-muted)' }}>
              <TrendingUp className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Yearly Spending</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(yearlySpending)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-purple-muted)' }}>
              <Calendar className="w-6 h-6" style={{ color: 'var(--accent-purple)' }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active Subscriptions</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                {activeCount} <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>/ {totalCount}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-blue-muted)' }}>
              <CreditCard className="w-6 h-6" style={{ color: 'var(--accent-blue)' }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Due This Week</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                {upcomingRenewals.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-amber-muted)' }}>
              <AlertCircle className="w-6 h-6" style={{ color: 'var(--accent-amber)' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Renewals */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Upcoming Renewals
          </h3>
          
          {upcomingRenewals.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No renewals in the next 7 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingRenewals.slice(0, 5).map(sub => {
                const daysUntil = getDaysUntil(sub.next_billing_date);
                return (
                  <button
                    key={sub.id}
                    onClick={() => onEdit(sub)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl transition-colors group"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: sub.category?.color || '#6b7280' }}
                    >
                      {sub.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{sub.name}</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {formatCurrency(sub.amount, sub.currency)} · {sub.billing_cycle}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium" style={{ 
                        color: daysUntil <= 1 ? 'var(--accent-red)' : daysUntil <= 3 ? 'var(--accent-amber)' : 'var(--text-secondary)'
                      }}>
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(sub.next_billing_date)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Spending by Category */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Spending by Category
          </h3>
          
          {chartData.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No spending data yet</p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-elevated)'
                      }}
                      labelStyle={{ color: 'var(--text-primary)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
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
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
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
