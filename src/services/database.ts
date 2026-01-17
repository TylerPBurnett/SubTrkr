import Database from '@tauri-apps/plugin-sql';
import { v4 as uuidv4 } from 'uuid';
import type { 
  Category, 
  Subscription, 
  Payment, 
  SubscriptionWithCategory,
  SpendingByCategory,
  BillingCycle 
} from '../types';

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:subtrkr.db');
  }
  return db;
}

// ============ Categories ============

export async function getCategories(): Promise<Category[]> {
  const database = await getDatabase();
  return database.select<Category[]>('SELECT * FROM categories ORDER BY name');
}

export async function createCategory(name: string, color: string, icon?: string): Promise<Category> {
  const database = await getDatabase();
  const id = `cat-${uuidv4()}`;
  await database.execute(
    'INSERT INTO categories (id, name, color, icon) VALUES ($1, $2, $3, $4)',
    [id, name, color, icon || null]
  );
  const [category] = await database.select<Category[]>(
    'SELECT * FROM categories WHERE id = $1',
    [id]
  );
  return category;
}

export async function updateCategory(id: string, name: string, color: string, icon?: string): Promise<void> {
  const database = await getDatabase();
  await database.execute(
    'UPDATE categories SET name = $1, color = $2, icon = $3 WHERE id = $4',
    [name, color, icon || null, id]
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const database = await getDatabase();
  // Set subscriptions with this category to null
  await database.execute(
    'UPDATE subscriptions SET category_id = NULL WHERE category_id = $1',
    [id]
  );
  await database.execute('DELETE FROM categories WHERE id = $1', [id]);
}

// ============ Subscriptions ============

export async function getSubscriptions(): Promise<SubscriptionWithCategory[]> {
  const database = await getDatabase();
  const subscriptions = await database.select<Subscription[]>(
    'SELECT * FROM subscriptions ORDER BY next_billing_date ASC'
  );
  const categories = await getCategories();
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  
  return subscriptions.map(sub => ({
    ...sub,
    category: sub.category_id ? categoryMap.get(sub.category_id) : undefined
  }));
}

export async function getActiveSubscriptions(): Promise<SubscriptionWithCategory[]> {
  const subscriptions = await getSubscriptions();
  return subscriptions.filter(s => s.is_active === 1);
}

export async function getSubscriptionById(id: string): Promise<SubscriptionWithCategory | null> {
  const database = await getDatabase();
  const [subscription] = await database.select<Subscription[]>(
    'SELECT * FROM subscriptions WHERE id = $1',
    [id]
  );
  if (!subscription) return null;
  
  if (subscription.category_id) {
    const [category] = await database.select<Category[]>(
      'SELECT * FROM categories WHERE id = $1',
      [subscription.category_id]
    );
    return { ...subscription, category };
  }
  return subscription;
}

export async function createSubscription(data: {
  name: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  category_id?: string;
  next_billing_date: string;
  start_date: string;
  notes?: string;
  url?: string;
  reminder_days?: number;
}): Promise<Subscription> {
  const database = await getDatabase();
  const id = `sub-${uuidv4()}`;
  const now = new Date().toISOString();
  
  await database.execute(
    `INSERT INTO subscriptions 
     (id, name, amount, currency, billing_cycle, category_id, next_billing_date, start_date, notes, url, reminder_days, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id,
      data.name,
      data.amount,
      data.currency,
      data.billing_cycle,
      data.category_id || null,
      data.next_billing_date,
      data.start_date,
      data.notes || null,
      data.url || null,
      data.reminder_days ?? 3,
      now,
      now
    ]
  );
  
  const [subscription] = await database.select<Subscription[]>(
    'SELECT * FROM subscriptions WHERE id = $1',
    [id]
  );
  return subscription;
}

export async function updateSubscription(
  id: string,
  data: Partial<Omit<Subscription, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const database = await getDatabase();
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fields = [
    'name', 'amount', 'currency', 'billing_cycle', 'category_id',
    'next_billing_date', 'start_date', 'notes', 'url', 'is_active', 'reminder_days'
  ] as const;

  for (const field of fields) {
    if (field in data) {
      updates.push(`${field} = $${paramIndex}`);
      values.push(data[field as keyof typeof data]);
      paramIndex++;
    }
  }

  if (updates.length === 0) return;

  updates.push(`updated_at = $${paramIndex}`);
  values.push(new Date().toISOString());
  paramIndex++;
  
  values.push(id);
  
  await database.execute(
    `UPDATE subscriptions SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

export async function deleteSubscription(id: string): Promise<void> {
  const database = await getDatabase();
  await database.execute('DELETE FROM subscriptions WHERE id = $1', [id]);
}

export async function toggleSubscriptionActive(id: string): Promise<void> {
  const database = await getDatabase();
  await database.execute(
    'UPDATE subscriptions SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = $1 WHERE id = $2',
    [new Date().toISOString(), id]
  );
}

// ============ Payments ============

export async function getPayments(subscriptionId?: string): Promise<Payment[]> {
  const database = await getDatabase();
  if (subscriptionId) {
    return database.select<Payment[]>(
      'SELECT * FROM payments WHERE subscription_id = $1 ORDER BY paid_at DESC',
      [subscriptionId]
    );
  }
  return database.select<Payment[]>('SELECT * FROM payments ORDER BY paid_at DESC');
}

export async function recordPayment(subscriptionId: string, amount: number, paidAt: string): Promise<Payment> {
  const database = await getDatabase();
  const id = `pay-${uuidv4()}`;
  
  await database.execute(
    'INSERT INTO payments (id, subscription_id, amount, paid_at) VALUES ($1, $2, $3, $4)',
    [id, subscriptionId, amount, paidAt]
  );
  
  const [payment] = await database.select<Payment[]>(
    'SELECT * FROM payments WHERE id = $1',
    [id]
  );
  return payment;
}

// ============ Analytics ============

export function calculateMonthlySpending(subscriptions: SubscriptionWithCategory[]): number {
  return subscriptions
    .filter(s => s.is_active === 1)
    .reduce((total, sub) => {
      switch (sub.billing_cycle) {
        case 'weekly': return total + (sub.amount * 52 / 12);
        case 'monthly': return total + sub.amount;
        case 'quarterly': return total + (sub.amount / 3);
        case 'yearly': return total + (sub.amount / 12);
        default: return total;
      }
    }, 0);
}

export function calculateYearlySpending(subscriptions: SubscriptionWithCategory[]): number {
  return subscriptions
    .filter(s => s.is_active === 1)
    .reduce((total, sub) => {
      switch (sub.billing_cycle) {
        case 'weekly': return total + (sub.amount * 52);
        case 'monthly': return total + (sub.amount * 12);
        case 'quarterly': return total + (sub.amount * 4);
        case 'yearly': return total + sub.amount;
        default: return total;
      }
    }, 0);
}

export async function getSpendingByCategory(subscriptions: SubscriptionWithCategory[]): Promise<SpendingByCategory[]> {
  const categories = await getCategories();
  const categoryMap = new Map<string, SpendingByCategory>();
  
  // Initialize with all categories
  for (const category of categories) {
    categoryMap.set(category.id, { category, total: 0, count: 0 });
  }
  
  // Calculate monthly normalized spending per category
  for (const sub of subscriptions.filter(s => s.is_active === 1)) {
    if (!sub.category_id) continue;
    
    const entry = categoryMap.get(sub.category_id);
    if (!entry) continue;
    
    let monthlyAmount: number;
    switch (sub.billing_cycle) {
      case 'weekly': monthlyAmount = sub.amount * 52 / 12; break;
      case 'monthly': monthlyAmount = sub.amount; break;
      case 'quarterly': monthlyAmount = sub.amount / 3; break;
      case 'yearly': monthlyAmount = sub.amount / 12; break;
      default: monthlyAmount = sub.amount;
    }
    
    entry.total += monthlyAmount;
    entry.count += 1;
  }
  
  return Array.from(categoryMap.values())
    .filter(entry => entry.count > 0)
    .sort((a, b) => b.total - a.total);
}

export async function getUpcomingRenewals(subscriptions: SubscriptionWithCategory[], days: number = 7): Promise<SubscriptionWithCategory[]> {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  return subscriptions
    .filter(sub => {
      if (sub.is_active !== 1) return false;
      const billingDate = new Date(sub.next_billing_date);
      return billingDate >= now && billingDate <= futureDate;
    })
    .sort((a, b) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime());
}

export function advanceNextBillingDate(subscription: Subscription): string {
  const currentDate = new Date(subscription.next_billing_date);
  
  switch (subscription.billing_cycle) {
    case 'weekly':
      currentDate.setDate(currentDate.getDate() + 7);
      break;
    case 'monthly':
      currentDate.setMonth(currentDate.getMonth() + 1);
      break;
    case 'quarterly':
      currentDate.setMonth(currentDate.getMonth() + 3);
      break;
    case 'yearly':
      currentDate.setFullYear(currentDate.getFullYear() + 1);
      break;
  }
  
  return currentDate.toISOString().split('T')[0];
}
