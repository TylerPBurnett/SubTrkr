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

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return;
    await createCategory(newCategory.name.trim(), newCategory.color);
    setNewCategory({ name: '', color: '#3b82f6' });
    setShowNewForm(false);
    onCategoriesChange();
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    await updateCategory(editingCategory.id, editingCategory.name.trim(), editingCategory.color);
    setEditingCategory(null);
    onCategoriesChange();
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
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Categories
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Organize your subscriptions by category
            </p>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* New Category Form */}
        {showNewForm && (
          <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Category name"
                className="flex-1 px-3 py-2 bg-white dark:bg-surface-800 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
              <button
                onClick={handleCreateCategory}
                disabled={!newCategory.name.trim()}
                className="p-2 bg-brand-500 hover:bg-brand-600 disabled:bg-neutral-300 text-white rounded-lg transition-colors"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setShowNewForm(false);
                  setNewCategory({ name: '', color: '#3b82f6' });
                }}
                className="p-2 bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              </button>
            </div>
            
            {/* Color picker */}
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(color => (
                <button
                  key={color}
                  onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    newCategory.color === color ? 'ring-2 ring-offset-2 ring-neutral-900 dark:ring-white scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
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
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors group"
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
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-surface-800 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleUpdateCategory}
                      className="p-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="p-1.5 bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="w-8 h-8 rounded-lg shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="flex-1 font-medium text-neutral-900 dark:text-white">
                    {category.name}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-neutral-500" />
                    </button>
                    {!category.id.match(/^cat-[a-z]+$/) && (
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
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
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          About SubTrkr
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          A simple, local-first subscription tracker built with Tauri, React, and SQLite.
        </p>
        <div className="space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
          <p>Version 1.0.0</p>
          <p>Your data is stored locally on your device.</p>
        </div>
      </div>
    </div>
  );
}
