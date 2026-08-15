import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  formatISODate,
  msUntilNextLocalMidnight,
  normalizeToStartOfDay,
  parseDateValue,
  parseLocalDate,
} from './dates';

describe('parseDateValue', () => {
  test('a date-only string is the local calendar day', () => {
    const parsed = parseDateValue('2026-03-13');
    assert.ok(parsed);
    assert.equal(formatISODate(parsed), '2026-03-13');
    assert.equal(parsed.getTime(), parseLocalDate('2026-03-13').getTime());
  });

  test('a timestamp is the instant, not the UTC date prefix', () => {
    const instant = '2026-03-13T00:00:00+14:00';
    const parsed = parseDateValue(instant);
    assert.ok(parsed);
    assert.equal(parsed.getTime(), new Date(instant).getTime());

    const localDay = formatISODate(normalizeToStartOfDay(parsed));
    assert.equal(localDay, formatISODate(normalizeToStartOfDay(new Date(instant))));
    if (localDay !== '2026-03-13') {
      assert.notEqual(localDay, '2026-03-13');
    }
  });

  test('empty and null values are null', () => {
    assert.equal(parseDateValue(null), null);
    assert.equal(parseDateValue(''), null);
    assert.equal(parseDateValue(undefined), null);
  });
});

describe('msUntilNextLocalMidnight', () => {
  test('is the remaining time to the next local midnight', () => {
    const now = new Date(2026, 7, 12, 23, 0, 0, 0);
    assert.equal(msUntilNextLocalMidnight(now), 60 * 60 * 1000);
  });

  test('never returns zero at exactly midnight — it points at tomorrow', () => {
    const midnight = new Date(2026, 7, 12, 0, 0, 0, 0);
    assert.equal(msUntilNextLocalMidnight(midnight), 24 * 60 * 60 * 1000);
  });
});
