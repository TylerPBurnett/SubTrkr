import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addMonths, subMonths } from 'date-fns';
import type { Category, ItemWithCategory } from '@/types';
import { formatISODate, getToday, parseLocalDate } from './dates';
import {
  UNCATEGORIZED_FILTER_ID,
  groupByDay,
  occurrenceAt,
  occurrenceIndexBounds,
  projectOccurrences,
  summariseDay,
  sumOccurrences,
} from './occurrences';
import { createCategoryLookup } from './categories';

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
    const CYCLES = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;
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
        anchor: parseLocalDate('2024-12-31'),
        rangeStart: parseLocalDate('2026-12-01'),
        rangeEnd: parseLocalDate('2027-01-15'),
      },
    ];

    const matchesPerCycle = new Map<string, number>();

    for (const { anchor, rangeStart, rangeEnd } of testCases) {
      for (const cycle of CYCLES) {
        const naive: string[] = [];
        for (let n = -2000; n <= 2000; n += 1) {
          const date = occurrenceAt(anchor, cycle, n);
          if (date >= rangeStart && date <= rangeEnd) naive.push(iso(date));
        }

        matchesPerCycle.set(cycle, (matchesPerCycle.get(cycle) ?? 0) + naive.length);

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

    for (const cycle of CYCLES) {
      assert.ok(
        (matchesPerCycle.get(cycle) ?? 0) > 0,
        `no test case produces a ${cycle} occurrence — the equivalence assertion is vacuous for this cycle`,
      );
    }
  });
});

function item(overrides: Partial<ItemWithCategory> = {}): ItemWithCategory {
  return {
    id: 'item-1',
    name: 'Netflix',
    amount: 22.99,
    currency: 'USD',
    billing_cycle: 'monthly',
    category_id: null,
    next_billing_date: '2026-08-13',
    start_date: '2026-01-13',
    notes: null,
    url: null,
    logo_url: null,
    is_active: true,
    status: 'active',
    paused_at: null,
    paused_until: null,
    cancelled_at: null,
    cancellation_date: null,
    archived_at: null,
    trial_started_at: null,
    trial_end_date: null,
    reminder_days: 3,
    item_type: 'subscription',
    created_at: '2026-01-13T00:00:00Z',
    updated_at: '2026-01-13T00:00:00Z',
    ...overrides,
  };
}

const dates = (occurrences: { isoDate: string }[]) => occurrences.map((o) => o.isoDate);

const H1 = parseLocalDate('2026-01-01');
const H2 = parseLocalDate('2026-12-31');

describe('projectOccurrences', () => {
  test('projects a monthly item across a year from its anchor', () => {
    const result = projectOccurrences([item()], H1, H2);
    assert.equal(result.length, 12);
    assert.equal(result[0].isoDate, '2026-01-13');
    assert.equal(result[11].isoDate, '2026-12-13');
    assert.equal(result[0].amount, 22.99);
  });

  test('never projects before start_date', () => {
    const result = projectOccurrences([item({ start_date: '2026-06-13' })], H1, H2);
    assert.deepEqual(dates(result).slice(0, 2), ['2026-06-13', '2026-07-13']);
  });

  test('a paused window suppresses only the occurrences inside it', () => {
    const result = projectOccurrences(
      [item({ status: 'paused', paused_at: '2026-03-13', paused_until: '2026-06-13' })],
      H1, H2,
    );
    // paused_at is inclusive: occurrence ON pause start is excluded
    assert.ok(!dates(result).includes('2026-03-13'));
    // paused_until is exclusive: occurrence ON pause end is included
    assert.ok(dates(result).includes('2026-06-13'));
    // mid-window occurrence is excluded
    assert.ok(!dates(result).includes('2026-05-13'));
    // pre-window occurrence is included
    assert.ok(dates(result).includes('2026-02-13'));
  });

  test('an indefinite pause suppresses everything after paused_at', () => {
    const result = projectOccurrences(
      [item({ status: 'paused', paused_at: '2026-03-01', paused_until: null })],
      H1, H2,
    );
    assert.deepEqual(dates(result), ['2026-01-13', '2026-02-13']);
  });

  test('cancellation keeps history and drops the future', () => {
    const result = projectOccurrences(
      [item({ status: 'cancelled', cancellation_date: '2026-04-13' })],
      H1, H2,
    );
    // cancellation_date is inclusive: occurrence ON cancel date is included
    assert.ok(dates(result).includes('2026-04-13'));
    // occurrence after cancel date is excluded
    assert.ok(!dates(result).includes('2026-05-13'));
    assert.deepEqual(dates(result), ['2026-01-13', '2026-02-13', '2026-03-13', '2026-04-13']);
  });

  test('a trial emits a trial-end marker and no charge before it', () => {
    const result = projectOccurrences(
      [item({ status: 'trial', trial_end_date: '2026-03-13', start_date: '2026-01-13' })],
      H1, H2,
    );
    const marker = result.filter((o) => o.kind === 'trial-end');
    assert.equal(marker.length, 1);
    assert.equal(marker[0].isoDate, '2026-03-13');
    assert.equal(marker[0].amount, 0);

    const charges = result.filter((o) => o.kind === 'charge');
    assert.ok(!dates(charges).includes('2026-02-13'));
    assert.ok(dates(charges).includes('2026-04-13'));
  });

  test('an item with no next_billing_date is skipped rather than throwing', () => {
    const result = projectOccurrences([item({ next_billing_date: '' })], H1, H2);
    assert.deepEqual(result, []);
  });

  test('results are sorted by date', () => {
    const result = projectOccurrences(
      [item({ id: 'b', next_billing_date: '2026-08-20' }), item({ id: 'a' })],
      parseLocalDate('2026-08-01'),
      parseLocalDate('2026-08-31'),
    );
    assert.deepEqual(dates(result), ['2026-08-13', '2026-08-20']);
  });

  test('isPast reflects whether occurrence date is before today', () => {
    const today = getToday();
    const pastDate = subMonths(today, 3);
    const futureDate = addMonths(today, 3);

    const pastResult = projectOccurrences(
      [item({ next_billing_date: formatISODate(pastDate) })],
      subMonths(today, 4),
      today,
    );
    const futureResult = projectOccurrences(
      [item({ next_billing_date: formatISODate(futureDate) })],
      today,
      addMonths(today, 4),
    );

    assert.ok(pastResult.length > 0, 'should find past occurrence');
    assert.ok(pastResult[0].isPast, 'past occurrence should have isPast=true');

    assert.ok(futureResult.length > 0, 'should find future occurrence');
    assert.ok(!futureResult[0].isPast, 'future occurrence should have isPast=false');
  });

  test('isOverdue is true for past active charges, false for cancelled/past', () => {
    const today = getToday();
    const pastDate = subMonths(today, 2);

    const activeResult = projectOccurrences(
      [item({ status: 'active', next_billing_date: formatISODate(pastDate) })],
      subMonths(today, 3),
      today,
    );
    const cancelledResult = projectOccurrences(
      [item({ status: 'cancelled', next_billing_date: formatISODate(pastDate), cancellation_date: formatISODate(pastDate) })],
      subMonths(today, 3),
      today,
    );

    const activeCharges = activeResult.filter((o) => o.kind === 'charge');
    const cancelledCharges = cancelledResult.filter((o) => o.kind === 'charge');

    assert.ok(activeCharges.length > 0, 'should find active charge');
    assert.ok(activeCharges[0].isOverdue, 'past active charge should be overdue');

    assert.ok(cancelledCharges.length > 0, 'should find cancelled charge');
    assert.ok(!cancelledCharges[0].isOverdue, 'past cancelled charge should not be overdue');
  });
});

const category = (id: string, color: string): Category => ({
  id,
  name: `Category ${id}`,
  color,
  icon: null,
  category_type: 'subscription',
  created_at: '2026-01-01T00:00:00Z',
});

describe('filters', () => {
  const items = [
    item({ id: 'sub', item_type: 'subscription', category_id: 'cat-a' }),
    item({ id: 'bill', item_type: 'bill', category_id: null }),
    item({ id: 'gone', status: 'archived', archived_at: '2026-06-01' }),
  ];

  test('archived items are excluded by default and opt-in only', () => {
    assert.ok(!projectOccurrences(items, H1, H2).some((o) => o.item.id === 'gone'));
    assert.ok(
      projectOccurrences(items, H1, H2, { includeArchived: true }).some((o) => o.item.id === 'gone'),
    );
  });

  test('itemType narrows to one kind', () => {
    const result = projectOccurrences(items, H1, H2, { itemType: 'bill' });
    assert.ok(result.every((o) => o.item.item_type === 'bill'));
    assert.ok(result.length > 0);
  });

  test('an uncategorised item matches only via the sentinel', () => {
    const withoutSentinel = projectOccurrences(items, H1, H2, { categoryIds: ['cat-a'] });
    assert.ok(!withoutSentinel.some((o) => o.item.id === 'bill'));

    const withSentinel = projectOccurrences(items, H1, H2, {
      categoryIds: ['cat-a', UNCATEGORIZED_FILTER_ID],
    });
    assert.ok(withSentinel.some((o) => o.item.id === 'bill'));
  });

  test('a null categoryIds applies no category filter', () => {
    const result = projectOccurrences(items, H1, H2, { categoryIds: null });
    assert.ok(result.some((o) => o.item.id === 'bill'));
    assert.ok(result.some((o) => o.item.id === 'sub'));
  });
});

describe('day folding', () => {
  test('groupByDay keys by ISO date and preserves order', () => {
    const grouped = groupByDay(
      projectOccurrences(
        [item({ id: 'a' }), item({ id: 'b', amount: 5, next_billing_date: '2026-08-13' })],
        parseLocalDate('2026-08-01'),
        parseLocalDate('2026-08-31'),
      ),
    );
    assert.equal(grouped.get('2026-08-13')?.length, 2);
    assert.equal(grouped.get('2026-08-13')?.[0].item.id, 'a');
  });

  test('sumOccurrences totals amounts', () => {
    const occurrences = projectOccurrences(
      [item({ id: 'a', amount: 10 }), item({ id: 'b', amount: 2.5 })],
      parseLocalDate('2026-08-01'),
      parseLocalDate('2026-08-31'),
    );
    assert.equal(sumOccurrences(occurrences), 12.5);
  });

  test('summariseDay takes its accent from the largest charge', () => {
    const lookup = createCategoryLookup([category('cat-a', '#111111'), category('cat-b', '#222222')]);
    const occurrences = projectOccurrences(
      [
        item({ id: 'small', amount: 5, category_id: 'cat-a' }),
        item({ id: 'big', amount: 50, category_id: 'cat-b' }),
      ],
      parseLocalDate('2026-08-01'),
      parseLocalDate('2026-08-31'),
    );

    const summary = summariseDay(occurrences, lookup);
    assert.equal(summary.accentColor, '#222222');
    assert.equal(summary.count, 2);
    assert.equal(summary.total, 55);
  });

  test('summariseDay reports an empty day', () => {
    const summary = summariseDay([], createCategoryLookup([]));
    assert.equal(summary.accentColor, null);
    assert.equal(summary.count, 0);
    assert.equal(summary.total, 0);
  });
});
