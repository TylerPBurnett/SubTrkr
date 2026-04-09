import type { BillingCycle, Item, ItemStatus, StatusChangeData } from '@/types';
import {
  calculateNextBillingDate as calcNextBillingDate,
  formatISODate,
  getNextBillingDateOnOrAfter,
  getNextFutureBillingDate,
  getToday,
} from '../../utils/dates';

export type TransactionalStatusAction =
  | Exclude<StatusChangeData['action'], 'convert'>
  | 'convert_trial'
  | 'trial_expired';

export interface ExecuteItemStatusChangeRpcParams {
  p_item_id: string;
  p_action: TransactionalStatusAction;
  p_effective_date: string | null;
  p_pause_until: string | null;
  p_trial_end_date: string | null;
  p_next_billing_date: string | null;
  p_clear_fields: string[];
  p_reason: string | null;
  p_notes: string | null;
  p_today: string;
  p_minimum_effective_date: string | null;
}

const ACTIVE_STATUS_CLEAR_FIELDS = [
  'paused_at',
  'paused_until',
  'cancelled_at',
  'cancellation_date',
  'archived_at',
  'trial_started_at',
  'trial_end_date',
] as const;

export function getTargetStatus(
  action: StatusChangeData['action'],
  currentStatus: ItemStatus,
): ItemStatus {
  const transitions: Record<string, ItemStatus> = {
    'active-pause': 'paused',
    'active-cancel': 'cancelled',
    'active-start_trial': 'trial',
    'paused-resume': 'active',
    'paused-cancel': 'cancelled',
    'cancelled-edit_cancellation': 'cancelled',
    'cancelled-reactivate': 'active',
    'cancelled-archive': 'archived',
    'archived-reactivate': 'active',
    'trial-convert': 'active',
    'trial-cancel': 'cancelled',
  };

  const key = `${currentStatus}-${action}`;
  const nextStatus = transitions[key];

  if (!nextStatus) {
    throw new Error(`Invalid status transition: ${currentStatus} -> ${action}`);
  }

  return nextStatus;
}

export function getCanonicalStatusChangeAction(
  action: StatusChangeData['action'],
): TransactionalStatusAction {
  return action === 'convert' ? 'convert_trial' : action;
}

export function resolveStatusChangeEffectiveDate(
  data: StatusChangeData,
  fallbackDate: string,
): string {
  switch (data.action) {
    case 'pause':
      return fallbackDate;
    case 'cancel':
    case 'edit_cancellation':
      return data.cancelledOn || fallbackDate;
    case 'resume':
    case 'reactivate':
      return data.resumedOn || fallbackDate;
    case 'convert':
      return data.convertedOn || fallbackDate;
    case 'archive':
    case 'start_trial':
      return fallbackDate;
  }
}

export function getNextBillingDateAfterResume(
  item: Item,
  resumedOn: string,
): string {
  if (item.next_billing_date >= resumedOn) {
    return item.next_billing_date;
  }

  const anchorDate = item.start_date || item.next_billing_date || resumedOn;
  return getNextBillingDateOnOrAfter(anchorDate, item.billing_cycle, resumedOn);
}

export function normalizeDateOnly(value: string | null | undefined): string | null {
  return value ? value.split('T')[0] : null;
}

function latestDate(...dates: Array<string | null | undefined>): string | null {
  const validDates = dates.filter((date): date is string => Boolean(date));
  if (validDates.length === 0) {
    return null;
  }

  validDates.sort();
  return validDates[validDates.length - 1];
}

export function getMinimumEffectiveDate(
  item: Item,
  action: StatusChangeData['action'],
): string | null {
  const startDate = normalizeDateOnly(item.start_date);

  switch (action) {
    case 'cancel':
    case 'edit_cancellation':
      return startDate;
    case 'resume':
      return latestDate(startDate, normalizeDateOnly(item.paused_at)) ?? startDate;
    case 'reactivate':
      return (
        latestDate(
          startDate,
          item.cancellation_date,
          normalizeDateOnly(item.cancelled_at),
          normalizeDateOnly(item.archived_at),
        ) ?? startDate
      );
    case 'convert':
      return latestDate(startDate, normalizeDateOnly(item.trial_started_at)) ?? startDate;
    case 'pause':
    case 'archive':
    case 'start_trial':
      return null;
  }
}

export function buildExecuteStatusChangeRpcParams(
  item: Item,
  data: StatusChangeData,
  today = formatISODate(getToday()),
): ExecuteItemStatusChangeRpcParams {
  const newStatus = getTargetStatus(data.action, item.status);
  const action = getCanonicalStatusChangeAction(data.action);
  const effectiveDate = resolveStatusChangeEffectiveDate(data, today);
  const minimumEffectiveDate = getMinimumEffectiveDate(item, data.action);
  let pauseUntil: string | null = null;
  let trialEndDate: string | null = null;
  let nextBillingDate: string | null = null;
  let clearFields: string[] = [];

  switch (newStatus) {
    case 'trial':
      trialEndDate = data.trialEndDate || null;
      break;
    case 'paused':
      pauseUntil = data.pauseUntil || null;
      break;
    case 'cancelled':
    case 'archived':
      break;
    case 'active':
      if (data.action === 'convert' && item.amount === 0) {
        throw new Error('Set an amount greater than 0 before converting this trial to paid');
      }

      clearFields = [...ACTIVE_STATUS_CLEAR_FIELDS];

      if (data.convertedOn) {
        nextBillingDate = getNextFutureBillingDate(data.convertedOn, item.billing_cycle);
      } else if (data.resumedOn) {
        nextBillingDate =
          data.action === 'resume'
            ? getNextBillingDateAfterResume(item, data.resumedOn)
            : getNextFutureBillingDate(data.resumedOn, item.billing_cycle);
      } else {
        nextBillingDate = getNextFutureBillingDate(
          item.next_billing_date,
          item.billing_cycle,
        );
      }
      break;
  }

  return {
    p_item_id: item.id,
    p_action: action,
    p_effective_date: effectiveDate,
    p_pause_until: pauseUntil,
    p_trial_end_date: trialEndDate,
    p_next_billing_date: nextBillingDate,
    p_clear_fields: clearFields,
    p_reason: data.reason?.trim() || null,
    p_notes: data.notes?.trim() || null,
    p_today: today,
    p_minimum_effective_date: minimumEffectiveDate,
  };
}

export function calculateNextBillingDate(
  dateStr: string,
  billingCycle: BillingCycle,
): string {
  return calcNextBillingDate(dateStr, billingCycle);
}
