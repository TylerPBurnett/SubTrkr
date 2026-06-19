import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { StatusChangeData } from '@/types';
import { getStatusActionButtonStyle } from './statusActionStyles';

const COLORED_ACTIONS: StatusChangeData['action'][] = [
  'pause',
  'cancel',
  'edit_cancellation',
  'resume',
  'reactivate',
  'convert',
  'start_trial',
];

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('getStatusActionButtonStyle', () => {
  test('uses readable foregrounds for every colored lifecycle action', () => {
    for (const action of COLORED_ACTIONS) {
      const style = getStatusActionButtonStyle(action);

      assert.match(style.background, /^#[0-9a-f]{6}$/i);
      assert.match(style.color, /^#[0-9a-f]{6}$/i);
      assert.ok(contrastRatio(style.background, style.color) >= 4.5);
      assert.equal(style.border, 'none');
    }
  });

  test('keeps archive styling neutral and theme-aware', () => {
    assert.deepEqual(getStatusActionButtonStyle('archive'), {
      background: 'var(--bg-active)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-strong)',
    });
  });
});
