import type { ItemStatus } from '@/types';
import { partitionByEligibility, type BulkStatusAction } from './statusActions';

export type HudAction = BulkStatusAction | 'category';

/**
 * Fixed presentation order. Actions may be omitted when nothing is eligible,
 * but the ones that remain never swap places — reordering by count would make
 * the bar reshuffle under the cursor as the selection changes.
 */
export const HUD_ACTION_ORDER: readonly HudAction[] = [
  'pause',
  'resume',
  'cancel',
  'reactivate',
  'archive',
  'category',
];

export const HUD_ACTION_LABELS: Record<HudAction, string> = {
  pause: 'Pause',
  resume: 'Resume',
  cancel: 'Cancel',
  reactivate: 'Reactivate',
  archive: 'Archive',
  category: 'Category',
};

export interface HudActionDescriptor {
  action: HudAction;
  label: string;
  eligibleCount: number;
  /** ids the action will actually be applied to */
  eligibleIds: string[];
  /** ids selected but ineligible, reported in the confirmation */
  skippedIds: string[];
  /** true only when the action applies to a strict subset of the selection */
  showCount: boolean;
}

export function buildHudActions<T extends { id: string; status: ItemStatus }>(
  items: readonly T[],
  maxInline: number,
): { inline: HudActionDescriptor[]; overflow: HudActionDescriptor[] } {
  const selectedCount = items.length;
  const descriptors: HudActionDescriptor[] = [];

  for (const action of HUD_ACTION_ORDER) {
    if (action === 'category') {
      descriptors.push({
        action,
        label: HUD_ACTION_LABELS[action],
        eligibleCount: selectedCount,
        eligibleIds: items.map((item) => item.id),
        skippedIds: [],
        showCount: false,
      });
      continue;
    }

    const { eligible, skipped } = partitionByEligibility(items, action);
    if (eligible.length === 0) {
      continue;
    }

    descriptors.push({
      action,
      label: HUD_ACTION_LABELS[action],
      eligibleCount: eligible.length,
      eligibleIds: eligible.map((item) => item.id),
      skippedIds: skipped.map((item) => item.id),
      showCount: eligible.length < selectedCount,
    });
  }

  return {
    inline: descriptors.slice(0, Math.max(0, maxInline)),
    overflow: descriptors.slice(Math.max(0, maxInline)),
  };
}
