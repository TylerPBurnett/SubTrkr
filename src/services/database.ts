import Database from '@tauri-apps/plugin-sql';
import { v4 as uuidv4 } from 'uuid';
import type { 
  Category, 
  Item, 
  Payment, 
  ItemWithCategory,
  SpendingByCategory,
  BillingCycle,
  ItemType
} from '../types';

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:subtrkr.db');
  }
  return db;
}

// ============ Categories ============

export async function getCategories(type?: ItemType): Promise<Category[]> {
  const database = await getDatabase();
  if (type) {
    return database.select<Category[]>(
      'SELECT * FROM categories WHERE category_type = $1 ORDER BY name',
      [type]
    );
  }
  return database.select<Category[]>('SELECT * FROM categories ORDER BY name');
}

export async function createCategory(
  name: string, 
  color: string, 
  categoryType: ItemType,
  icon?: string
): Promise<Category> {
  const database = await getDatabase();
  const id = `cat-${uuidv4()}`;
  await database.execute(
    'INSERT INTO categories (id, name, color, icon, category_type) VALUES ($1, $2, $3, $4, $5)',
    [id, name, color, icon || null, categoryType]
  );
  const [category] = await database.select<Category[]>(
    'SELECT * FROM categories WHERE id = $1',
    [id]
  );
  return category;
}

export async function updateCategory(
  id: string, 
  name: string, 
  color: string, 
  icon?: string
): Promise<void> {
  const database = await getDatabase();
  await database.execute(
    'UPDATE categories SET name = $1, color = $2, icon = $3 WHERE id = $4',
    [name, color, icon || null, id]
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const database = await getDatabase();
  // Set items with this category to null
  await database.execute(
    'UPDATE items SET category_id = NULL WHERE category_id = $1',
    [id]
  );
  await database.execute('DELETE FROM categories WHERE id = $1', [id]);
}

// ============ Items (Bills & Subscriptions) ============

export async function getItems(type?: ItemType): Promise<ItemWithCategory[]> {
  const database = await getDatabase();
  let items: Item[];
  
  if (type) {
    items = await database.select<Item[]>(
      'SELECT * FROM items WHERE item_type = $1 ORDER BY next_billing_date ASC',
      [type]
    );
  } else {
    items = await database.select<Item[]>(
      'SELECT * FROM items ORDER BY next_billing_date ASC'
    );
  }
  
  const categories = await getCategories();
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  
  return items.map(item => ({
    ...item,
    category: item.category_id ? categoryMap.get(item.category_id) : undefined
  }));
}

export async function getActiveItems(type?: ItemType): Promise<ItemWithCategory[]> {
  const items = await getItems(type);
  return items.filter(s => s.is_active === 1);
}

export async function getItemById(id: string): Promise<ItemWithCategory | null> {
  const database = await getDatabase();
  const [item] = await database.select<Item[]>(
    'SELECT * FROM items WHERE id = $1',
    [id]
  );
  if (!item) return null;
  
  if (item.category_id) {
    const [category] = await database.select<Category[]>(
      'SELECT * FROM categories WHERE id = $1',
      [item.category_id]
    );
    return { ...item, category };
  }
  return item;
}

export async function createItem(data: {
  name: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  item_type: ItemType;
  category_id?: string;
  next_billing_date: string;
  start_date: string;
  notes?: string;
  url?: string;
  reminder_days?: number;
}): Promise<Item> {
  const database = await getDatabase();
  const id = `item-${uuidv4()}`;
  const now = new Date().toISOString();
  
  await database.execute(
    `INSERT INTO items 
     (id, name, amount, currency, billing_cycle, item_type, category_id, next_billing_date, start_date, notes, url, reminder_days, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id,
      data.name,
      data.amount,
      data.currency,
      data.billing_cycle,
      data.item_type,
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
  
  const [item] = await database.select<Item[]>(
    'SELECT * FROM items WHERE id = $1',
    [id]
  );
  return item;
}

export async function updateItem(
  id: string,
  data: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const database = await getDatabase();
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fields = [
    'name', 'amount', 'currency', 'billing_cycle', 'item_type', 'category_id',
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
    `UPDATE items SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

export async function deleteItem(id: string): Promise<void> {
  const database = await getDatabase();
  await database.execute('DELETE FROM items WHERE id = $1', [id]);
}

export async function toggleItemActive(id: string): Promise<void> {
  const database = await getDatabase();
  await database.execute(
    'UPDATE items SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = $1 WHERE id = $2',
    [new Date().toISOString(), id]
  );
}

// ============ Payments ============

export async function getPayments(itemId?: string): Promise<Payment[]> {
  const database = await getDatabase();
  if (itemId) {
    return database.select<Payment[]>(
      'SELECT * FROM payments WHERE item_id = $1 ORDER BY paid_at DESC',
      [itemId]
    );
  }
  return database.select<Payment[]>('SELECT * FROM payments ORDER BY paid_at DESC');
}

export async function recordPayment(itemId: string, amount: number, paidAt: string): Promise<Payment> {
  const database = await getDatabase();
  const id = `pay-${uuidv4()}`;
  
  await database.execute(
    'INSERT INTO payments (id, item_id, amount, paid_at) VALUES ($1, $2, $3, $4)',
    [id, itemId, amount, paidAt]
  );
  
  const [payment] = await database.select<Payment[]>(
    'SELECT * FROM payments WHERE id = $1',
    [id]
  );
  return payment;
}

// ============ Analytics ============

export function calculateMonthlySpending(items: ItemWithCategory[], type?: ItemType): number {
  return items
    .filter(s => s.is_active === 1 && (!type || s.item_type === type))
    .reduce((total, item) => {
      switch (item.billing_cycle) {
        case 'weekly': return total + (item.amount * 52 / 12);
        case 'monthly': return total + item.amount;
        case 'quarterly': return total + (item.amount / 3);
        case 'yearly': return total + (item.amount / 12);
        default: return total;
      }
    }, 0);
}

export function calculateYearlySpending(items: ItemWithCategory[], type?: ItemType): number {
  return items
    .filter(s => s.is_active === 1 && (!type || s.item_type === type))
    .reduce((total, item) => {
      switch (item.billing_cycle) {
        case 'weekly': return total + (item.amount * 52);
        case 'monthly': return total + (item.amount * 12);
        case 'quarterly': return total + (item.amount * 4);
        case 'yearly': return total + item.amount;
        default: return total;
      }
    }, 0);
}

export async function getSpendingByCategory(
  items: ItemWithCategory[], 
  type?: ItemType
): Promise<SpendingByCategory[]> {
  const categories = await getCategories(type);
  const categoryMap = new Map<string, SpendingByCategory>();
  
  // Initialize with categories of the specified type
  for (const category of categories) {
    categoryMap.set(category.id, { category, total: 0, count: 0 });
  }
  
  // Calculate monthly normalized spending per category
  for (const item of items.filter(s => s.is_active === 1 && (!type || s.item_type === type))) {
    if (!item.category_id) continue;
    
    const entry = categoryMap.get(item.category_id);
    if (!entry) continue;
    
    let monthlyAmount: number;
    switch (item.billing_cycle) {
      case 'weekly': monthlyAmount = item.amount * 52 / 12; break;
      case 'monthly': monthlyAmount = item.amount; break;
      case 'quarterly': monthlyAmount = item.amount / 3; break;
      case 'yearly': monthlyAmount = item.amount / 12; break;
      default: monthlyAmount = item.amount;
    }
    
    entry.total += monthlyAmount;
    entry.count += 1;
  }
  
  return Array.from(categoryMap.values())
    .filter(entry => entry.count > 0)
    .sort((a, b) => b.total - a.total);
}

export async function getUpcomingItems(
  items: ItemWithCategory[], 
  days: number = 7,
  type?: ItemType
): Promise<ItemWithCategory[]> {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  return items
    .filter(item => {
      if (item.is_active !== 1) return false;
      if (type && item.item_type !== type) return false;
      const billingDate = new Date(item.next_billing_date);
      return billingDate >= now && billingDate <= futureDate;
    })
    .sort((a, b) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime());
}

export function advanceNextBillingDate(item: Item): string {
  const currentDate = new Date(item.next_billing_date);
  
  switch (item.billing_cycle) {
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
