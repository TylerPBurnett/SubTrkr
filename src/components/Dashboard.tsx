import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  CreditCard,
  Receipt,
  AlertCircle,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Category, ItemWithCategory, SpendingByCategory } from '../types';
import {
  calculateMonthlySpending,
  calculateYearlySpending,
  getSpendingByCategory,
  getUpcomingItems
} from '../services/database';
import { formatShortDate, getDaysUntil } from '../utils/dates';
import ServiceLogo from './ui/ServiceLogo';

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

export default function Dashboard({ items, categories, onEdit }: DashboardProps) {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [yearlySpending, setYearlySpending] = useState(0);
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingByCategory[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<ItemWithCategory[]>([]);
  
  // Get the type filter for database queries
  const typeFilter = filterTab === 'all' ? undefined : filterTab;

  // Load stats when items or filter changes
  useEffect(() => {
    async function loadStats() {
      const [monthly, yearly, byCategory, upcoming] = await Promise.all([
        Promise.resolve(calculateMonthlySpending(items, typeFilter)),
        Promise.resolve(calculateYearlySpending(items, typeFilter)),
        Promise.resolve(getSpendingByCategory(items, categories, typeFilter)),
        getUpcomingItems(items, 7, typeFilter),
      ]);
      setMonthlySpending(monthly);
      setYearlySpending(yearly);
      setSpendingByCategory(byCategory);
      setUpcomingItems(upcoming);
    }
    loadStats();
  }, [items, categories, typeFilter]);

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

  // Tab labels
  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'bill', label: 'Bills' },
    { id: 'subscription', label: 'Subscriptions' },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: filterTab === tab.id ? 'var(--brand-primary)' : 'var(--bg-hover)',
              color: filterTab === tab.id ? 'var(--text-inverse)' : 'var(--text-secondary)',
              fontWeight: 700,
              letterSpacing: '-0.01em'
            }}
            onMouseEnter={(e) => {
              if (filterTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'var(--bg-active)';
              }
            }}
            onMouseLeave={(e) => {
              if (filterTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Spending Card */}
        <div className="stagger-item card" style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
          borderLeft: '4px solid var(--brand-primary)'
        }}>
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
        <div className="stagger-item card" style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
          borderLeft: '4px solid var(--accent-purple)'
        }}>
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
        <div className="stagger-item card" style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
          borderLeft: '4px solid var(--accent-blue)'
        }}>
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
        <div className="stagger-item card" style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
          borderLeft: '4px solid var(--accent-amber)'
        }}>
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
                    className="stagger-item w-full flex items-center gap-4 p-3 rounded-xl transition-all group"
                    style={{
                      backgroundColor: 'transparent',
                      animationDelay: `${index * 0.05}s`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      e.currentTarget.style.transform = 'scale(1.01)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
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
