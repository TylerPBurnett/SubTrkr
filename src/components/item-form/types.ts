import type {
  BillingCycle,
  Category,
  ItemFormData,
  ItemStatus,
  ItemType,
  ItemWithCategory,
} from '@/types';

export interface ItemFormSaveData {
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
  logo_url?: string;
  reminder_days?: number;
  status?: ItemStatus;
  trial_end_date?: string;
}

export interface ItemFormProps {
  item?: ItemWithCategory | null;
  categories: Category[];
  itemType: ItemType;
  isSaving?: boolean;
  onSave: (data: ItemFormSaveData) => void;
  onClose: () => void;
}

export type ItemFormErrors = Partial<Record<keyof ItemFormData, string>>;

export interface ItemFormLabels {
  singular: string;
  namePlaceholder: string;
}

export interface ItemFormVisualConfig {
  gradient: string;
  glowColor: string;
  textColor: string;
  contrastText: string;
}
