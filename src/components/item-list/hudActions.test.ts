import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { ItemStatus } from '@/types';
import { buildHudActions, HUD_ACTION_ORDER } from './hudActions';

function selection(...statuses: ItemStatus[]) {
  return statuses.map((status, index) => ({ id: `item-${index}`, status }));
}

describe('buildHudActions', () => {
  test('keeps a fixed order regardless of eligible counts', () => {
    assert.deepEqual(HUD_ACTION_ORDER, [
      'pause',
      'resume',
      'cancel',
      'reactivate',
      'archive',
      'category',
    ]);
  });

  test('omits counts when every selected item is eligible', () => {
    const { inline, overflow } = buildHudActions(
      selection('active', 'active', 'active'),
      3,
    );

    assert.deepEqual(
      inline.map((action) => [action.action, action.showCount]),
      [['pause', false], ['cancel', false], ['category', false]],
    );
    assert.equal(overflow.length, 0);
  });

  test('shows counts only on actions that skip something', () => {
    const { inline } = buildHudActions(
      selection('active', 'active', 'paused'),
      3,
    );

    const byAction = new Map(inline.map((action) => [action.action, action]));

    assert.equal(byAction.get('pause')?.eligibleCount, 2);
    assert.equal(byAction.get('pause')?.showCount, true);
    assert.equal(byAction.get('resume')?.eligibleCount, 1);
    assert.equal(byAction.get('resume')?.showCount, true);
    assert.equal(byAction.get('cancel')?.showCount, false);
  });

  test('collapses everything past maxInline into overflow', () => {
    const { inline, overflow } = buildHudActions(
      selection('active', 'active', 'cancelled', 'cancelled'),
      3,
    );

    assert.deepEqual(
      inline.map((action) => action.action),
      ['pause', 'cancel', 'reactivate'],
    );
    assert.deepEqual(
      overflow.map((action) => action.action),
      ['archive', 'category'],
    );
  });

  test('drops actions no selected item is eligible for', () => {
    const { inline, overflow } = buildHudActions(selection('archived'), 3);
    const present = [...inline, ...overflow].map((action) => action.action);

    assert.ok(!present.includes('pause'));
    assert.ok(!present.includes('archive'));
    assert.ok(present.includes('reactivate'));
  });

  test('collapses all actions when maxInline is zero', () => {
    const { inline, overflow } = buildHudActions(
      selection('active', 'active'),
      0,
    );

    assert.equal(inline.length, 0);
    assert.ok(overflow.length > 0);
  });

  test('always offers category regardless of status', () => {
    const { inline, overflow } = buildHudActions(selection('archived'), 3);
    const present = [...inline, ...overflow].map((action) => action.action);

    assert.ok(present.includes('category'));
  });
});
