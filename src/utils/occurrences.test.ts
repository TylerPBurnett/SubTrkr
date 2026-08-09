import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseLocalDate } from './dates';
import { occurrenceAt, occurrenceIndexBounds } from './occurrences';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('occurrenceAt', () => {
  test('walks monthly forward and backward from the anchor', () => {
    const anchor = parseLocalDate('2026-08-13');
    assert.equal(iso(occurrenceAt(anchor, 'monthly', 0)), '2026-08-13');
    assert.equal(iso(occurrenceAt(anchor, 'monthly', 2)), '2026-10-13');
    assert.equal(iso(occurrenceAt(anchor, 'monthly', -3)), '2026-05-13');
  });

  test('a month-end anchor recovers its day instead of drifting', () => {
    const anchor = parseLocalDate('2026-01-31');
    assert.equal(iso(occurrenceAt(anchor, 'monthly', 1)), '2026-02-28');
    assert.equal(iso(occurrenceAt(anchor, 'monthly', 2)), '2026-03-31');
    assert.equal(iso(occurrenceAt(anchor, 'monthly', 3)), '2026-04-30');
  });

  test('a Feb 29 yearly anchor clamps in a non-leap year', () => {
    const anchor = parseLocalDate('2024-02-29');
    assert.equal(iso(occurrenceAt(anchor, 'yearly', 1)), '2025-02-28');
    assert.equal(iso(occurrenceAt(anchor, 'yearly', 4)), '2028-02-29');
  });

  test('weekly and quarterly step by the right unit', () => {
    const anchor = parseLocalDate('2026-08-13');
    assert.equal(iso(occurrenceAt(anchor, 'weekly', 3)), '2026-09-03');
    assert.equal(iso(occurrenceAt(anchor, 'quarterly', 2)), '2027-02-13');
  });
});

describe('occurrenceIndexBounds', () => {
  test('bounds cover every occurrence a naive scan would find', () => {
    const anchor = parseLocalDate('2019-03-07');
    const rangeStart = parseLocalDate('2026-08-01');
    const rangeEnd = parseLocalDate('2026-08-31');

    for (const cycle of ['weekly', 'monthly', 'quarterly', 'yearly'] as const) {
      const naive: string[] = [];
      for (let n = -2000; n <= 2000; n += 1) {
        const date = occurrenceAt(anchor, cycle, n);
        if (date >= rangeStart && date <= rangeEnd) naive.push(iso(date));
      }

      const { lo, hi } = occurrenceIndexBounds(anchor, cycle, rangeStart, rangeEnd);
      const solved: string[] = [];
      for (let n = lo; n <= hi; n += 1) {
        const date = occurrenceAt(anchor, cycle, n);
        if (date >= rangeStart && date <= rangeEnd) solved.push(iso(date));
      }

      assert.deepEqual(solved, naive, `cycle ${cycle}`);
    }
  });

  test('the scanned span stays small for a distant anchor', () => {
    const { lo, hi } = occurrenceIndexBounds(
      parseLocalDate('2005-01-01'),
      'monthly',
      parseLocalDate('2026-08-01'),
      parseLocalDate('2026-08-31'),
    );
    assert.ok(hi - lo <= 4, `expected a tight span, got ${hi - lo}`);
  });

  test('padding absorbs month-end clamping across multiple cases', () => {
    const testCases = [
      {
        anchor: parseLocalDate('2026-01-31'),
        rangeStart: parseLocalDate('2026-02-20'),
        rangeEnd: parseLocalDate('2026-03-10'),
      },
      {
        anchor: parseLocalDate('2019-03-31'),
        rangeStart: parseLocalDate('2019-01-15'),
        rangeEnd: parseLocalDate('2019-05-20'),
      },
      {
        anchor: parseLocalDate('2025-04-30'),
        rangeStart: parseLocalDate('2025-03-10'),
        rangeEnd: parseLocalDate('2025-06-15'),
      },
      {
        anchor: parseLocalDate('2024-02-29'),
        rangeStart: parseLocalDate('2026-12-20'),
        rangeEnd: parseLocalDate('2027-01-10'),
      },
    ];

    for (const { anchor, rangeStart, rangeEnd } of testCases) {
      for (const cycle of ['weekly', 'monthly', 'quarterly', 'yearly'] as const) {
        const naive: string[] = [];
        for (let n = -2000; n <= 2000; n += 1) {
          const date = occurrenceAt(anchor, cycle, n);
          if (date >= rangeStart && date <= rangeEnd) naive.push(iso(date));
        }

        const { lo, hi } = occurrenceIndexBounds(anchor, cycle, rangeStart, rangeEnd);
        const solved: string[] = [];
        for (let n = lo; n <= hi; n += 1) {
          const date = occurrenceAt(anchor, cycle, n);
          if (date >= rangeStart && date <= rangeEnd) solved.push(iso(date));
        }

        assert.deepEqual(
          solved,
          naive,
          `anchor ${iso(anchor)}, range ${iso(rangeStart)}..${iso(rangeEnd)}, cycle ${cycle}`,
        );
      }
    }
  });
});
