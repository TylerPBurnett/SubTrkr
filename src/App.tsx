import { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Receipt,
  BarChart3, 
  Settings as SettingsIcon,
  Plus,
  Moon,
  Sun
} from 'lucide-react';
import type { ItemWithCategory, Category, ItemType } from './types';
import { 
  getItems, 
  getCategories,
  createItem,
  updateItem,
  deleteItem,
  toggleItemActive,
  advancePastDueItems
} from './services/database';
import Dashboard from './components/Dashboard';
import ItemList from './components/ItemList';
import ItemForm from './components/ItemForm';
import Analytics from './components/Analytics';
import Settings from './components/Settings';

type View = 'dashboard' | 'bills' | 'subscriptions' | 'analytics' | 'settings';
type Theme = 'light' | 'dark';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formItemType, setFormItemType] = useState<ItemType>('subscription');
  const [editingItem, setEditingItem] = useState<ItemWithCategory | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('subtrkr-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const loadData = useCallback(async () => {
    try {
      // Advance any past-due billing dates before loading
      await advancePastDueItems();
      
      const [itemsData, cats] = await Promise.all([
        getItems(),
        getCategories()
      ]);
      setItems(itemsData);
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

  // Theme switching via data-theme attribute + localStorage persistence
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('subtrkr-theme', theme);
  }, [theme]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleCreateItem = async (data: Parameters<typeof createItem>[0]) => {
    setIsSaving(true);
    setError(null);
    try {
      await createItem(data);
      await loadData();
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create item:', err);
      setError('Failed to create item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async (id: string, data: Parameters<typeof updateItem>[1]) => {
    setIsSaving(true);
    setError(null);
    try {
      await updateItem(id, data);
      await loadData();
      setEditingItem(null);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('Failed to update item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setError(null);
    try {
      await deleteItem(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError('Failed to delete item. Please try again.');
    }
  };

  const handleToggleActive = async (id: string) => {
    setError(null);
    try {
      await toggleItemActive(id);
      await loadData();
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('Failed to update item. Please try again.');
    }
  };

  const handleEdit = (item: ItemWithCategory) => {
    setEditingItem(item);
    setFormItemType(item.item_type);
    setShowForm(true);
  };

  const handleAddNew = (itemType: ItemType) => {
    setEditingItem(null);
    setFormItemType(itemType);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bills' as const, label: 'Bills', icon: Receipt },
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
                {view === 'bills' && 'Bills'}
                {view === 'subscriptions' && 'Subscriptions'}
                {view === 'analytics' && 'Analytics'}
                {view === 'settings' && 'Settings'}
              </h2>
              <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                {view === 'dashboard' && 'Your spending overview at a glance'}
                {view === 'bills' && 'Manage your recurring bills and utilities'}
                {view === 'subscriptions' && 'Manage all your recurring subscriptions'}
                {view === 'analytics' && 'Spending insights and trends'}
                {view === 'settings' && 'Configure your preferences'}
              </p>
            </div>

            {view === 'bills' && (
              <button
                onClick={() => handleAddNew('bill')}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Add Bill
              </button>
            )}
            {view === 'subscriptions' && (
              <button
                onClick={() => handleAddNew('subscription')}
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
              items={items} 
              onEdit={handleEdit}
            />
          )}
          {view === 'bills' && (
            <ItemList
              items={items}
              categories={categories}
              itemType="bill"
              onEdit={handleEdit}
              onDelete={handleDeleteItem}
              onToggleActive={handleToggleActive}
              onAddNew={() => handleAddNew('bill')}
            />
          )}
          {view === 'subscriptions' && (
            <ItemList
              items={items}
              categories={categories}
              itemType="subscription"
              onEdit={handleEdit}
              onDelete={handleDeleteItem}
              onToggleActive={handleToggleActive}
              onAddNew={() => handleAddNew('subscription')}
            />
          )}
          {view === 'analytics' && (
            <Analytics items={items} />
          )}
          {view === 'settings' && (
            <Settings 
              categories={categories}
              onCategoriesChange={loadData}
            />
          )}
        </div>
      </main>

      {/* Error Toast */}
      {error && (
        <div 
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg"
          style={{ 
            backgroundColor: 'var(--accent-red)',
            color: 'white'
          }}
        >
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-white/20 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Item Form Modal */}
      {showForm && (
        <ItemForm
          item={editingItem}
          categories={categories}
          itemType={formItemType}
          isSaving={isSaving}
          onSave={editingItem 
            ? (data) => handleUpdateItem(editingItem.id, data)
            : handleCreateItem
          }
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

export default App;
