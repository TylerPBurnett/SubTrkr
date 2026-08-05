import type { ItemStatus, StatusChangeData } from '@/types';

type StatusAction = StatusChangeData['action'];

/**
 * Single source of truth for which lifecycle actions are legal from which
 * status. Consumed by both ItemListActionsMenu (per-item) and the selection
 * HUD (bulk) so the two surfaces cannot drift.
 */
export const STATUS_ACTION_SOURCES: Record<StatusAction, readonly ItemStatus[]> = {
  pause: ['active'],
  resume: ['paused'],
  cancel: ['active', 'paused', 'trial'],
  reactivate: ['cancelled', 'archived'],
  archive: ['cancelled'],
  convert: ['trial'],
  start_trial: ['active'],
  edit_cancellation: ['cancelled'],
};

/**
 * Actions offered in bulk. convert, start_trial and edit_cancellation are
 * excluded: each needs a per-item date judgement that one shared value would
 * falsify.
 */
export const BULK_ACTIONS = [
  'pause',
  'resume',
  'cancel',
  'reactivate',
  'archive',
] as const;

export type BulkStatusAction = (typeof BULK_ACTIONS)[number];

export function isActionEligible(
  status: ItemStatus,
  action: StatusAction,
): boolean {
  return STATUS_ACTION_SOURCES[action].includes(status);
}

export function partitionByEligibility<T extends { status: ItemStatus }>(
  items: readonly T[],
  action: StatusAction,
): { eligible: T[]; skipped: T[] } {
  const eligible: T[] = [];
  const skipped: T[] = [];

  for (const item of items) {
    if (isActionEligible(item.status, action)) {
      eligible.push(item);
    } else {
      skipped.push(item);
    }
  }

  return { eligible, skipped };
}
