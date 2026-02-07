import { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { Plus, Pencil, X, Check, Receipt, CreditCard, User, LogOut } from 'lucide-react';
import type { Category, ItemType } from '../types';
import { createCategory, updateCategory, deleteCategory } from '../services/database';
import { supabase } from '../services/supabase';
import { signOut } from '../services/auth';

const NotificationSettings = lazy(() => import('./NotificationSettings'));

interface SettingsProps {
  categories: Category[];
  onCategoriesChange: () => void;
}

const colorOptions = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#6b7280', // gray
];

export default function Settings({ categories, onCategoriesChange }: SettingsProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3b82f6', type: 'subscription' as ItemType });
  const [showNewForm, setShowNewForm] = useState<ItemType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  // Split categories by type
  const subscriptionCategories = useMemo(() =>
    categories.filter(c => c.category_type === 'subscription'), [categories]);
  const billCategories = useMemo(() =>
    categories.filter(c => c.category_type === 'bill'), [categories]);

  // Fetch current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email || '');
      }
    });
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleCreateCategory = async (type: ItemType) => {
    const trimmedName = newCategory.name.trim();
    if (!trimmedName || isCreating) return;
    
    setIsCreating(true);
    try {
      await createCategory(trimmedName, newCategory.color, type);
      setNewCategory({ name: '', color: '#3b82f6', type: 'subscription' });
      setShowNewForm(null);
      await onCategoriesChange();
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    try {
      await updateCategory(editingCategory.id, editingCategory.name.trim(), editingCategory.color);
      setEditingCategory(null);
      await onCategoriesChange();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
    onCategoriesChange();
  };

  // Render a category section
  const renderCategorySection = (type: ItemType, categoryList: Category[], title: string, description: string, icon: React.ReactNode) => (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-hover)' }}>
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNewForm(type)}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* New Category Form */}
      {showNewForm === type && (
        <div 
          className="mb-4 p-4 rounded-xl"
          style={{ backgroundColor: 'var(--bg-hover)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCategory.name.trim()) {
                  e.preventDefault();
                  handleCreateCategory(type);
                }
              }}
              placeholder="Category name"
              className="input flex-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'var(--brand-primary)' } as React.CSSProperties}
              autoFocus
            />
            <button
              type="button"
              onClick={() => handleCreateCategory(type)}
              disabled={!newCategory.name.trim() || isCreating}
              className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: 'var(--brand-primary)', 
                color: 'var(--text-inverse)' 
              }}
            >
              {isCreating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => {
                setShowNewForm(null);
                setNewCategory({ name: '', color: '#3b82f6', type: 'subscription' });
              }}
              className="btn-secondary p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Color picker */}
          <div className="flex flex-wrap gap-2">
            {colorOptions.map(color => (
              <button
                key={color}
                onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                className={`w-6 h-6 rounded-full transition-transform ${
                  newCategory.color === color ? 'ring-2 ring-offset-2 scale-110' : ''
                }`}
                style={{ 
                  backgroundColor: color,
                  '--tw-ring-color': 'var(--text-primary)',
                  '--tw-ring-offset-color': 'var(--bg-hover)'
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      )}

      {/* Editing Form */}
      {editingCategory && editingCategory.category_type === type && (
        <div 
          className="mb-4 p-4 rounded-xl"
          style={{ backgroundColor: 'var(--bg-hover)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-6 h-6 rounded-lg shrink-0"
              style={{ backgroundColor: editingCategory.color }}
            />
            <input
              type="text"
              value={editingCategory.name}
              onChange={(e) => setEditingCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleUpdateCategory();
                } else if (e.key === 'Escape') {
                  setEditingCategory(null);
                }
              }}
              className="input flex-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'var(--brand-primary)' } as React.CSSProperties}
              autoFocus
            />
            <button
              onClick={handleUpdateCategory}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--text-inverse)' }}
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={() => setEditingCategory(null)}
              className="btn-secondary p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Color picker for editing */}
          <div className="flex flex-wrap gap-2">
            {colorOptions.map(color => (
              <button
                key={color}
                onClick={() => setEditingCategory(prev => prev ? { ...prev, color } : null)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  editingCategory.color === color ? 'ring-2 ring-offset-2 scale-110' : ''
                }`}
                style={{ 
                  backgroundColor: color,
                  '--tw-ring-color': 'var(--text-primary)',
                  '--tw-ring-offset-color': 'var(--bg-hover)'
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category Chip Grid */}
      {categoryList.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No categories yet. Add one above.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categoryList.map(category => (
            <div
              key={category.id}
              className="group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all cursor-default"
              style={{
                backgroundColor: 'var(--bg-hover)',
                border: '2px solid var(--border-default)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-active)';
                e.currentTarget.style.borderColor = category.color;
                e.currentTarget.style.boxShadow = `0 2px 8px ${category.color}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                {category.name}
              </span>
              <button
                onClick={() => setEditingCategory(category)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDeleteCategory(category.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                style={{ color: 'var(--accent-red)' }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl space-y-8">
      {/* Subscription Categories */}
      {renderCategorySection(
        'subscription',
        subscriptionCategories,
        'Subscription Categories',
        'Organize your subscriptions',
        <CreditCard className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
      )}

      {/* Bill Categories */}
      {renderCategorySection(
        'bill',
        billCategories,
        'Bill Categories',
        'Organize your bills and utilities',
        <Receipt className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
      )}

      {/* Notification Settings */}
      <Suspense fallback={
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }} />
            <span style={{ color: 'var(--text-muted)' }}>Loading notification settings...</span>
          </div>
        </div>
      }>
        <NotificationSettings />
      </Suspense>

      {/* Account */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Account
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Manage your account settings
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <div className="input px-4 py-2 rounded-lg" style={{ color: 'var(--text-primary)' }}>
              {userEmail || 'Loading...'}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors"
            style={{ color: 'var(--accent-red)' }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          About SubTrkr
        </h3>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
          A cloud-native subscription and bills tracker built with Tauri, React, and Supabase.
        </p>
        <div className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <p>Version 1.0.0</p>
          <p>Your data is securely stored in the cloud and synced across all your devices.</p>
        </div>
      </div>
    </div>
  );
}
