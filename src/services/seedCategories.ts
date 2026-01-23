import { supabase } from './supabase';

const DEFAULT_SUBSCRIPTION_CATEGORIES = [
  { name: 'Streaming', color: '#ef4444', icon: 'tv', category_type: 'subscription' },
  { name: 'Software', color: '#3b82f6', icon: 'code', category_type: 'subscription' },
  { name: 'Gaming', color: '#8b5cf6', icon: 'gamepad-2', category_type: 'subscription' },
  { name: 'News', color: '#f59e0b', icon: 'newspaper', category_type: 'subscription' },
  { name: 'Fitness', color: '#10b981', icon: 'dumbbell', category_type: 'subscription' },
  { name: 'Music', color: '#ec4899', icon: 'music', category_type: 'subscription' },
  { name: 'Cloud Storage', color: '#06b6d4', icon: 'cloud', category_type: 'subscription' },
  { name: 'Other', color: '#6b7280', icon: 'box', category_type: 'subscription' },
];

const DEFAULT_BILL_CATEGORIES = [
  { name: 'Utilities', color: '#f97316', icon: 'zap', category_type: 'bill' },
  { name: 'Housing', color: '#84cc16', icon: 'home', category_type: 'bill' },
  { name: 'Insurance', color: '#0ea5e9', icon: 'shield', category_type: 'bill' },
  { name: 'Phone & Internet', color: '#8b5cf6', icon: 'smartphone', category_type: 'bill' },
  { name: 'Transportation', color: '#f59e0b', icon: 'car', category_type: 'bill' },
];

export async function seedDefaultCategoriesIfNeeded(): Promise<void> {
  const { count, error } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  if (count && count > 0) return; // Already has categories

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const allCategories = [...DEFAULT_SUBSCRIPTION_CATEGORIES, ...DEFAULT_BILL_CATEGORIES].map(
    (cat) => ({ ...cat, user_id: user.id })
  );

  const { error: insertError } = await supabase.from('categories').insert(allCategories);
  if (insertError) throw insertError;
}
