import type { StatusChangeData } from '@/types';

interface StatusActionButtonStyle {
  background: string;
  border: string;
  color: string;
}

const ACTION_BACKGROUNDS = {
  pause: '#92400e',
  cancel: '#b91c1c',
  edit_cancellation: '#1d4ed8',
  resume: '#1d4ed8',
  reactivate: '#15803d',
  convert: '#15803d',
  start_trial: '#6d28d9',
} satisfies Record<Exclude<StatusChangeData['action'], 'archive'>, string>;

export function getStatusActionButtonStyle(
  action: StatusChangeData['action'],
): StatusActionButtonStyle {
  if (action === 'archive') {
    return {
      background: 'var(--bg-active)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-strong)',
    };
  }

  return {
    background: ACTION_BACKGROUNDS[action],
    color: '#ffffff',
    border: 'none',
  };
}
