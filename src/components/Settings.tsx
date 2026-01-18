import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import type { Category } from '../types';
import { createCategory, updateCategory, deleteCategory } from '../services/database';

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
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3b82f6' });
  const [showNewForm, setShowNewForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCategory = async () => {
    const trimmedName = newCategory.name.trim();
    if (!trimmedName || isCreating) return;
    
    setIsCreating(true);
    try {
      await createCategory(trimmedName, newCategory.color);
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
    if (id.startsWith('cat-') && !id.includes('-')) {
      // Don't allow deleting default categories
      return;
    }
    await deleteCategory(id);
    onCategoriesChange();
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Categories */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Categories
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Organize your subscriptions by category
            </p>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* New Category Form */}
        {showNewForm && (
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
                    handleCreateCategory();
                  }
                }}
                placeholder="Category name"
                className="input flex-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--brand-primary)' } as React.CSSProperties}
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateCategory}
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
                    '--tw-ring-offset-color': 'var(--bg-hover)'
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        )}

        {/* Category List */}
        <div className="space-y-2">
          {categories.map(category => (
            <div
              key={category.id}
              className="flex items-center gap-3 p-3 rounded-xl transition-colors group"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {editingCategory?.id === category.id ? (
                <>
                  <div
                    className="w-8 h-8 rounded-lg shrink-0"
                    style={{ backgroundColor: editingCategory.color }}
                  />
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="input flex-1 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': 'var(--brand-primary)' } as React.CSSProperties}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleUpdateCategory}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--text-inverse)' }}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="btn-secondary p-1.5 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="w-8 h-8 rounded-lg shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="flex-1 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {category.name}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!category.id.match(/^cat-[a-z]+$/) && (
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--accent-red)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-red-muted)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          About SubTrkr
        </h3>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
          A simple, local-first subscription tracker built with Tauri, React, and SQLite.
        </p>
        <div className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <p>Version 1.0.0</p>
          <p>Your data is stored locally on your device.</p>
        </div>
      </div>
    </div>
  );
}
