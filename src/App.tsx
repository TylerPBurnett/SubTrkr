import { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  BarChart3, 
  Settings as SettingsIcon,
  Plus,
  Moon,
  Sun
} from 'lucide-react';
import type { SubscriptionWithCategory, Category } from './types';
import { 
  getSubscriptions, 
  getCategories,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  toggleSubscriptionActive
} from './services/database';
import Dashboard from './components/Dashboard';
import SubscriptionList from './components/SubscriptionList';
import SubscriptionForm from './components/SubscriptionForm';
import Analytics from './components/Analytics';
import Settings from './components/Settings';

type View = 'dashboard' | 'subscriptions' | 'analytics' | 'settings';
type Theme = 'light' | 'dark';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionWithCategory | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');

  const loadData = useCallback(async () => {
    try {
      const [subs, cats] = await Promise.all([
        getSubscriptions(),
        getCategories()
      ]);
      setSubscriptions(subs);
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Theme switching via data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleCreateSubscription = async (data: Parameters<typeof createSubscription>[0]) => {
    await createSubscription(data);
    await loadData();
    setShowForm(false);
  };

  const handleUpdateSubscription = async (id: string, data: Parameters<typeof updateSubscription>[1]) => {
    await updateSubscription(id, data);
    await loadData();
    setEditingSubscription(null);
    setShowForm(false);
  };

  const handleDeleteSubscription = async (id: string) => {
    await deleteSubscription(id);
    await loadData();
  };

  const handleToggleActive = async (id: string) => {
    await toggleSubscriptionActive(id);
    await loadData();
  };

  const handleEdit = (subscription: SubscriptionWithCategory) => {
    setEditingSubscription(subscription);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSubscription(null);
  };

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subscriptions' as const, label: 'Subscriptions', icon: CreditCard },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { id: 'settings' as const, label: 'Settings', icon: SettingsIcon },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full" style={{ backgroundColor: 'var(--brand-muted)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside className="sidebar w-64 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--brand-text)' }}>
            <CreditCard className="w-6 h-6" />
            SubTrkr
          </h1>
        </div>

        <nav className="flex-1 px-3">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 ${
                view === item.id ? 'nav-item-active font-medium' : 'nav-item'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl btn-secondary"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {view === 'dashboard' && 'Dashboard'}
                {view === 'subscriptions' && 'Subscriptions'}
                {view === 'analytics' && 'Analytics'}
                {view === 'settings' && 'Settings'}
              </h2>
              <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                {view === 'dashboard' && 'Your subscription overview at a glance'}
                {view === 'subscriptions' && 'Manage all your recurring subscriptions'}
                {view === 'analytics' && 'Spending insights and trends'}
                {view === 'settings' && 'Configure your preferences'}
              </p>
            </div>

            {(view === 'dashboard' || view === 'subscriptions') && (
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Add Subscription
              </button>
            )}
          </div>

          {/* Content */}
          {view === 'dashboard' && (
            <Dashboard 
              subscriptions={subscriptions} 
              onEdit={handleEdit}
            />
          )}
          {view === 'subscriptions' && (
            <SubscriptionList
              subscriptions={subscriptions}
              categories={categories}
              onEdit={handleEdit}
              onDelete={handleDeleteSubscription}
              onToggleActive={handleToggleActive}
              onAddNew={() => setShowForm(true)}
            />
          )}
          {view === 'analytics' && (
            <Analytics subscriptions={subscriptions} />
          )}
          {view === 'settings' && (
            <Settings 
              categories={categories}
              onCategoriesChange={loadData}
            />
          )}
        </div>
      </main>

      {/* Subscription Form Modal */}
      {showForm && (
        <SubscriptionForm
          subscription={editingSubscription}
          categories={categories}
          onSave={editingSubscription 
            ? (data) => handleUpdateSubscription(editingSubscription.id, data)
            : handleCreateSubscription
          }
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

export default App;
