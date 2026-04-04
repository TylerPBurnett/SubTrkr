import type { ItemStatus, ItemWithCategory, StatusHistory } from '../types';
import { parseLocalDate } from './dates';
import {
  getResolvedStatusHistoryAction,
  getResolvedStatusHistoryEffectiveDate,
} from './statusHistory';

type StatusTransition = {
  action: string | null;
  effectiveDate: Date;
  recordedAt: Date | null;
  status: ItemStatus;
};

export function parseDateValue(value: string | null | undefined): Date | null {
  if (!value) return null;

  const parsed = value.includes('T') ? new Date(value) : parseLocalDate(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeToStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isOnOrBeforeDay(date: Date, comparedTo: Date): boolean {
  return normalizeToStartOfDay(date).getTime() <= normalizeToStartOfDay(comparedTo).getTime();
}

function getMonthRange(date: Date): { start: Date; endExclusive: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const endExclusive = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, endExclusive };
}

function getStatusTransitions(statusHistory: StatusHistory[]): StatusTransition[] {
  const historyEntries = statusHistory
    .map((entry) => {
      const effectiveDate =
        parseDateValue(getResolvedStatusHistoryEffectiveDate(entry)) ?? parseDateValue(entry.changed_at);
      if (!effectiveDate) return null;

      return {
        action: getResolvedStatusHistoryAction(entry),
        effectiveDate: normalizeToStartOfDay(effectiveDate),
        recordedAt: parseDateValue(entry.changed_at),
        status: entry.status,
      };
    })
    .filter((entry): entry is StatusTransition => entry !== null);

  const byRecordedOrder = [...historyEntries].sort((lhs, rhs) => {
    const lhsRecordedAt = lhs.recordedAt ?? lhs.effectiveDate;
    const rhsRecordedAt = rhs.recordedAt ?? rhs.effectiveDate;
    return lhsRecordedAt.getTime() - rhsRecordedAt.getTime();
  });

  const normalizedTransitions: StatusTransition[] = [];

  for (const entry of byRecordedOrder) {
    if (entry.action === 'edit_cancellation') {
      for (let index = normalizedTransitions.length - 1; index >= 0; index -= 1) {
        const previous = normalizedTransitions[index];
        if (
          previous.status === 'cancelled'
          && (previous.action === 'cancel' || previous.action === 'trial_expired' || previous.action === null)
        ) {
          normalizedTransitions[index] = {
            ...previous,
            effectiveDate: entry.effectiveDate,
          };
          break;
        }
      }
      continue;
    }

    normalizedTransitions.push(entry);
  }

  return normalizedTransitions.sort((lhs, rhs) => {
    if (lhs.effectiveDate.getTime() !== rhs.effectiveDate.getTime()) {
      return lhs.effectiveDate.getTime() - rhs.effectiveDate.getTime();
    }

    const lhsRecordedAt = lhs.recordedAt ?? lhs.effectiveDate;
    const rhsRecordedAt = rhs.recordedAt ?? rhs.effectiveDate;
    return lhsRecordedAt.getTime() - rhsRecordedAt.getTime();
  });
}

function inferredInitialStatus(item: ItemWithCategory, transitions: StatusTransition[]): ItemStatus {
  if (transitions[0]?.action === 'convert_trial') {
    return 'trial';
  }

  if (item.status === 'trial' || item.trial_started_at) {
    return 'trial';
  }

  return 'active';
}

function wasItemActiveUsingCurrentFields(
  item: ItemWithCategory,
  monthStart: Date,
  monthEndExclusive: Date
): boolean {
  const monthEnd = new Date(monthEndExclusive.getTime() - 1000);
  const startDate = parseDateValue(item.start_date) ?? parseDateValue(item.created_at);

  if (!startDate || startDate > monthEnd || item.status === 'trial') {
    return false;
  }

  const cancellationDate = parseDateValue(item.cancellation_date);
  if (cancellationDate && isOnOrBeforeDay(cancellationDate, monthStart)) {
    return false;
  }

  const cancelledAt = parseDateValue(item.cancelled_at);
  if (cancelledAt && isOnOrBeforeDay(cancelledAt, monthStart)) {
    return false;
  }

  const archivedAt = parseDateValue(item.archived_at);
  if (archivedAt && isOnOrBeforeDay(archivedAt, monthStart)) {
    return false;
  }

  const pausedAt = parseDateValue(item.paused_at);
  if (pausedAt && isOnOrBeforeDay(pausedAt, monthStart)) {
    const pausedUntil = parseDateValue(item.paused_until);
    if (pausedUntil) {
      return !isOnOrBeforeDay(monthEnd, pausedUntil);
    }

    return item.status !== 'paused';
  }

  return true;
}

function wasItemActive(
  item: ItemWithCategory,
  monthStart: Date,
  monthEndExclusive: Date,
  statusHistory: StatusHistory[]
): boolean {
  if (statusHistory.length === 0) {
    return wasItemActiveUsingCurrentFields(item, monthStart, monthEndExclusive);
  }

  const startDate = parseDateValue(item.start_date) ?? parseDateValue(item.created_at);
  if (!startDate) return false;

  const normalizedStartDate = normalizeToStartOfDay(startDate);
  if (normalizedStartDate >= monthEndExclusive) {
    return false;
  }

  const transitions = getStatusTransitions(statusHistory);
  let currentStatus = inferredInitialStatus(item, transitions);
  let segmentStart = normalizedStartDate;

  for (const transition of transitions) {
    const transitionDate = transition.effectiveDate;

    if (transitionDate <= segmentStart) {
      currentStatus = transition.status;
      continue;
    }

    if (currentStatus === 'active' && segmentStart < monthEndExclusive && transitionDate > monthStart) {
      return true;
    }

    if (transitionDate >= monthEndExclusive) {
      break;
    }

    currentStatus = transition.status;
    segmentStart = transitionDate;
  }

  return currentStatus === 'active' && segmentStart < monthEndExclusive;
}

export function calculateNormalizedMonthlyAmount(
  item: Pick<ItemWithCategory, 'amount' | 'billing_cycle'>
): number {
  switch (item.billing_cycle) {
    case 'weekly':
      return (item.amount * 52) / 12;
    case 'monthly':
      return item.amount;
    case 'quarterly':
      return item.amount / 3;
    case 'yearly':
      return item.amount / 12;
    default:
      return item.amount;
  }
}

export function calculateProjectedMonthlySpendingForMonth(
  items: ItemWithCategory[],
  statusHistoryByItem: Record<string, StatusHistory[]>,
  monthDate: Date
): number {
  const { start, endExclusive } = getMonthRange(monthDate);

  return items.reduce((total, item) => {
    return wasItemActive(item, start, endExclusive, statusHistoryByItem[item.id] ?? [])
      ? total + calculateNormalizedMonthlyAmount(item)
      : total;
  }, 0);
}
