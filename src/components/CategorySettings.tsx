import { useState, useMemo } from 'react';
import { Plus, Pencil, X, Check, Tag } from 'lucide-react';
import type { Category, ItemType } from '../types';
import { createCategory, updateCategory, deleteCategory } from '../services/database';
import SegmentedControl from './ui/SegmentedControl';
import { Input } from './ui/input';

interface CategorySettingsProps {
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

type FilterType = 'all' | 'subscription' | 'bill';

export default function CategorySettings({ categories, onCategoriesChange }: CategorySettingsProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3b82f6' });
  const [showNewForm, setShowNewForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');

  const filterTabs: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'subscription', label: 'Subscriptions' },
    { id: 'bill', label: 'Bills' },
  ];

  const filteredCategories = useMemo(() => {
    if (filterType === 'all') return categories;
    return categories.filter(c => c.category_type === filterType);
  }, [categories, filterType]);

  const getCreateType = (): ItemType => {
    if (filterType === 'all') return 'subscription';
    return filterType;
  };

  const handleCreateCategory = async () => {
    const trimmedName = newCategory.name.trim();
    if (!trimmedName || isCreating) return;

    setIsCreating(true);
    try {
      await createCategory(trimmedName, newCategory.color, getCreateType());
      setNewCategory({ name: '', color: '#3b82f6' });
      setShowNewForm(false);
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

  return (
    <div className="space-y-8 animate-in">
      <div className="card">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <Tag className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Categories
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Organize your subscriptions and bills
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        <div className="mb-5">
          <SegmentedControl tabs={filterTabs} activeTab={filterType} onTabChange={setFilterType} />
        </div>

        {/* New Category Form */}
        {showNewForm && (
          <div
            className="mb-4 p-4 rounded-xl"
            style={{ backgroundColor: 'var(--bg-hover)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: 'var(--brand-primary-light)',
                  color: 'var(--brand-primary)',
                }}
              >
                {getCreateType() === 'subscription' ? 'Subscription' : 'Bill'}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <Input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCategory.name.trim()) {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
                placeholder="Category name"
                className="h-9 flex-1"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={!newCategory.name.trim() || isCreating}
                className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--brand-primary)',
                  color: 'var(--text-inverse)',
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
                  setShowNewForm(false);
                  setNewCategory({ name: '', color: '#3b82f6' });
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
                    '--tw-ring-offset-color': 'var(--bg-hover)',
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        )}

        {/* Editing Form */}
        {editingCategory && (
          <div
            className="mb-4 p-4 rounded-xl"
            style={{ backgroundColor: 'var(--bg-hover)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-6 h-6 rounded-lg shrink-0"
                style={{ backgroundColor: editingCategory.color }}
              />
              <Input
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
                className="h-9 flex-1"
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
                    '--tw-ring-offset-color': 'var(--bg-hover)',
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        )}

        {/* Category Chip Grid */}
        {filteredCategories.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {categories.length === 0
              ? 'No categories yet. Add one above.'
              : `No ${filterType === 'all' ? '' : filterType} categories yet.`}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filteredCategories.map(category => {
              const categoryColor = category.color;
              return (
                <div
                  key={category.id}
                  className="group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all cursor-default"
                  style={{
                    backgroundColor: 'var(--bg-hover)',
                    border: '2px solid var(--border-default)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-active)';
                    e.currentTarget.style.borderColor = categoryColor;
                    e.currentTarget.style.boxShadow = `0 2px 8px ${categoryColor}40`;
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
                {filterType === 'all' && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{
                      backgroundColor: 'var(--bg-active)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {category.category_type === 'subscription' ? 'sub' : 'bill'}
                  </span>
                )}
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
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
