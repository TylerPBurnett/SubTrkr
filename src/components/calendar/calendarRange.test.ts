import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { formatISODate, parseLocalDate } from '@/utils/dates';
import {
  buildGridDays,
  formatRangeTitle,
  getCalendarRange,
  shiftAnchor,
} from './calendarRange';

describe('getCalendarRange', () => {
  test('month range is the calendar month, grid is week-padded', () => {
    const range = getCalendarRange('month', parseLocalDate('2026-08-13'));
    assert.equal(formatISODate(range.rangeStart), '2026-08-01');
    assert.equal(formatISODate(range.rangeEnd), '2026-08-31');
    assert.equal(formatISODate(range.gridStart), '2026-07-26');
    assert.equal(formatISODate(range.gridEnd), '2026-09-05');
  });

  test('week range and grid are identical', () => {
    const range = getCalendarRange('week', parseLocalDate('2026-08-13'));
    assert.equal(formatISODate(range.rangeStart), '2026-08-09');
    assert.equal(formatISODate(range.rangeEnd), '2026-08-15');
    assert.equal(formatISODate(range.gridStart), '2026-08-09');
    assert.equal(formatISODate(range.gridEnd), '2026-08-15');
  });

  test('year range is the calendar year', () => {
    const range = getCalendarRange('year', parseLocalDate('2026-08-13'));
    assert.equal(formatISODate(range.rangeStart), '2026-01-01');
    assert.equal(formatISODate(range.rangeEnd), '2026-12-31');
    assert.equal(formatISODate(range.gridStart), '2025-12-28');
    assert.equal(formatISODate(range.gridEnd), '2027-01-02');
  });

  test('the month grid always holds whole weeks', () => {
    for (const iso of ['2026-02-13', '2026-08-13', '2027-05-01']) {
      const range = getCalendarRange('month', parseLocalDate(iso));
      const days = buildGridDays(range.gridStart, range.gridEnd);
      assert.equal(days.length % 7, 0, `expected whole weeks for ${iso}`);
    }
  });
});

describe('shiftAnchor', () => {
  test('paging moves by one lens unit', () => {
    const anchor = parseLocalDate('2026-08-13');
    assert.equal(formatISODate(shiftAnchor('week', anchor, 1)), '2026-08-20');
    assert.equal(formatISODate(shiftAnchor('month', anchor, -1)), '2026-07-13');
    assert.equal(formatISODate(shiftAnchor('year', anchor, 1)), '2027-08-13');
  });

  test('paging a month-end anchor does not strand it', () => {
    assert.equal(formatISODate(shiftAnchor('month', parseLocalDate('2026-01-31'), 1)), '2026-02-28');
  });
});

describe('formatRangeTitle', () => {
  test('each lens names its range', () => {
    const anchor = parseLocalDate('2026-08-13');
    assert.equal(formatRangeTitle('month', anchor), 'August 2026');
    assert.equal(formatRangeTitle('year', anchor), '2026');
    assert.equal(formatRangeTitle('week', anchor), 'Aug 9 – 15, 2026');
  });

  test('a week spanning two months names both', () => {
    assert.equal(
      formatRangeTitle('week', parseLocalDate('2026-08-31')),
      'Aug 30 – Sep 5, 2026',
    );
  });
});
