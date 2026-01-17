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

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionWithCategory | null>(null);
  const [darkMode, setDarkMode] = useState(false);

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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

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
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-500/20" />
          <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-surface-800 border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
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
                view === item.id
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-medium'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                {view === 'dashboard' && 'Dashboard'}
                {view === 'subscriptions' && 'Subscriptions'}
                {view === 'analytics' && 'Analytics'}
                {view === 'settings' && 'Settings'}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                {view === 'dashboard' && 'Your subscription overview at a glance'}
                {view === 'subscriptions' && 'Manage all your recurring subscriptions'}
                {view === 'analytics' && 'Spending insights and trends'}
                {view === 'settings' && 'Configure your preferences'}
              </p>
            </div>

            {(view === 'dashboard' || view === 'subscriptions') && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all duration-200"
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
