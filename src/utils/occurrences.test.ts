import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { subMonths } from 'date-fns';
import type { Category, ItemWithCategory } from '@/types';
import { formatISODate, getToday, parseLocalDate } from './dates';
import {
  UNCATEGORIZED_FILTER_ID,
  describeTrialKeepCost,
  getItemSchedule,
  groupByDay,
  occurrenceAt,
  occurrenceIndexBounds,
  projectOccurrences,
  summariseDay,
  sumOccurrences,
  type Occurrence,
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

  test('a trial emits only a trial-end marker — no paid charges until convert', () => {
    const result = projectOccurrences(
      [item({ status: 'trial', trial_end_date: '2026-03-13', start_date: '2026-01-13' })],
      H1, H2,
    );
    const marker = result.filter((o) => o.kind === 'trial-end');
    assert.equal(marker.length, 1);
    assert.equal(marker[0].isoDate, '2026-03-13');
    assert.equal(marker[0].amount, 0);

    const charges = result.filter((o) => o.kind === 'charge');
    assert.deepEqual(dates(charges), []);
  });

  test('describeTrialKeepCost names the future price without calling it due', () => {
    assert.equal(
      describeTrialKeepCost(item({ amount: 4, billing_cycle: 'monthly' })),
      'If you keep this, $4.00 / month',
    );
  });

  test('a trial with no end date emits nothing', () => {
    const result = projectOccurrences(
      [item({ status: 'trial', trial_end_date: null, start_date: '2026-01-13' })],
      H1, H2,
    );
    assert.deepEqual(result, []);
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

  test('isPast reflects whether occurrence date is before the supplied today', () => {
    const today = parseLocalDate('2026-08-12');
    const pastDate = parseLocalDate('2026-05-12');
    const futureDate = parseLocalDate('2026-11-12');

    const pastResult = projectOccurrences(
      [item({ next_billing_date: '2026-05-12' })],
      parseLocalDate('2026-04-01'),
      today,
      {},
      today,
    );
    const futureResult = projectOccurrences(
      [item({ next_billing_date: '2026-11-12' })],
      today,
      parseLocalDate('2026-12-31'),
      {},
      today,
    );

    const pastOccurrence = pastResult.find((entry) => entry.isoDate === formatISODate(pastDate));
    const futureOccurrence = futureResult.find((entry) => entry.isoDate === formatISODate(futureDate));

    assert.ok(pastOccurrence, 'should find past occurrence');
    assert.equal(pastOccurrence.isPast, true);

    assert.ok(futureOccurrence, 'should find future occurrence');
    assert.equal(futureOccurrence.isPast, false);
  });

  test('isOverdue is only the past next_billing_date, not every historical projection', () => {
    const today = parseLocalDate('2026-08-12');
    const result = projectOccurrences(
      [item({ status: 'active', next_billing_date: '2026-07-13', start_date: '2026-01-13' })],
      parseLocalDate('2026-06-01'),
      parseLocalDate('2026-08-31'),
      {},
      today,
    );
    const byDate = Object.fromEntries(result.map((occurrence) => [occurrence.isoDate, occurrence]));

    assert.equal(byDate['2026-06-13']?.isPast, true);
    assert.equal(byDate['2026-06-13']?.isOverdue, false, 'earlier projection is scheduled history, not overdue');
    assert.equal(byDate['2026-07-13']?.isOverdue, true, 'the unpaid next_billing_date is overdue');
    assert.equal(byDate['2026-08-13']?.isPast, false);
    assert.equal(byDate['2026-08-13']?.isOverdue, false, 'future projection of an overdue item is not itself overdue');
  });

  test('a cancelled item is never overdue even on its next_billing_date', () => {
    const today = parseLocalDate('2026-08-12');
    const result = projectOccurrences(
      [item({
        status: 'cancelled',
        next_billing_date: '2026-07-13',
        cancellation_date: '2026-07-13',
      })],
      parseLocalDate('2026-06-01'),
      today,
      {},
      today,
    );

    assert.ok(result.some((occurrence) => occurrence.isoDate === '2026-07-13'));
    assert.ok(result.every((occurrence) => !occurrence.isOverdue));
  });

  test('projectOccurrences uses the supplied today, not the wall clock', () => {
    const frozen = parseLocalDate('2026-08-10');
    const result = projectOccurrences(
      [item({ next_billing_date: '2026-08-11', start_date: '2026-01-11' })],
      parseLocalDate('2026-08-01'),
      parseLocalDate('2026-08-31'),
      {},
      frozen,
    );
    const occurrence = result.find((entry) => entry.isoDate === '2026-08-11');

    assert.ok(occurrence, 'should find the Aug 11 charge');
    assert.equal(occurrence.isPast, false, 'Aug 11 is not past when today is frozen at Aug 10');
    assert.equal(occurrence.isOverdue, false);
  });

  test('timestamp lifecycle fields use the local day of the instant, not the UTC date prefix', () => {
    // 2026-03-13 00:00 in UTC+14 is 2026-03-12 10:00Z. parseLocalDate would
    // take the "2026-03-13" prefix and land a day later in most timezones.
    const instant = '2026-03-13T00:00:00+14:00';
    const expectedDay = formatISODate(new Date(new Date(instant).getFullYear(), new Date(instant).getMonth(), new Date(instant).getDate()));
    const schedule = getItemSchedule(item({
      status: 'paused',
      paused_at: instant,
      paused_until: null,
    }));

    assert.ok(schedule?.pausedFrom);
    assert.equal(formatISODate(schedule.pausedFrom), expectedDay);
    if (expectedDay !== '2026-03-13') {
      assert.notEqual(
        formatISODate(schedule.pausedFrom),
        '2026-03-13',
        'must not treat the UTC date prefix of a timestamp as a local calendar day',
      );
    }
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

  test('paused items are included by default and excluded when includePaused is false', () => {
    const itemsWithPaused = [
      item({ id: 'paused-item', status: 'paused', paused_at: '2026-03-13', paused_until: '2026-06-13' }),
    ];
    const defaultResult = projectOccurrences(itemsWithPaused, H1, H2);
    assert.ok(defaultResult.length > 0, 'paused item should produce occurrences by default');
    assert.ok(defaultResult.some((o) => o.item.id === 'paused-item'));

    const excludedResult = projectOccurrences(itemsWithPaused, H1, H2, { includePaused: false });
    assert.ok(!excludedResult.some((o) => o.item.id === 'paused-item'));
  });

  test('cancelled items are included by default and excluded when includeCancelled is false', () => {
    const itemsWithCancelled = [
      item({ id: 'cancelled-item', status: 'cancelled', cancellation_date: '2026-04-13' }),
    ];
    const defaultResult = projectOccurrences(itemsWithCancelled, H1, H2);
    assert.ok(defaultResult.length > 0, 'cancelled item should produce occurrences by default');
    assert.ok(defaultResult.some((o) => o.item.id === 'cancelled-item'));

    const excludedResult = projectOccurrences(itemsWithCancelled, H1, H2, { includeCancelled: false });
    assert.ok(!excludedResult.some((o) => o.item.id === 'cancelled-item'));
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
    const testDate = parseLocalDate('2026-08-13');

    // Construct occurrences directly with largest LAST to prove it finds by amount, not position
    const occurrences: Occurrence[] = [
      {
        id: 'small:2026-08-13:charge',
        item: item({ id: 'small', amount: 5, category_id: 'cat-a' }),
        date: testDate,
        isoDate: '2026-08-13',
        amount: 5,
        kind: 'charge',
        isPast: false,
        isOverdue: false,
      },
      {
        id: 'big:2026-08-13:charge',
        item: item({ id: 'big', amount: 50, category_id: 'cat-b' }),
        date: testDate,
        isoDate: '2026-08-13',
        amount: 50,
        kind: 'charge',
        isPast: false,
        isOverdue: false,
      },
    ];

    const summary = summariseDay(occurrences, lookup);
    assert.equal(summary.accentColor, '#222222');
    assert.equal(summary.chargeCount, 2);
    assert.equal(summary.total, 55);
  });

  test('summariseDay reports an empty day', () => {
    const summary = summariseDay([], createCategoryLookup([]));
    assert.equal(summary.accentColor, null);
    assert.equal(summary.chargeCount, 0);
    assert.equal(summary.total, 0);
  });

  test('summariseDay reports hasOverdue for past active charges', () => {
    const today = getToday();
    const pastDate = subMonths(today, 2);
    const occurrences = projectOccurrences(
      [item({ status: 'active', next_billing_date: formatISODate(pastDate) })],
      subMonths(today, 3),
      today,
    ).filter((o) => o.kind === 'charge');

    assert.ok(occurrences.length > 0, 'should have at least one overdue charge');
    const summary = summariseDay(occurrences, createCategoryLookup([]));
    assert.equal(summary.hasOverdue, true);
  });

  test('summariseDay reports hasTrialEnd for trial-end occurrences', () => {
    const trialEndDate = parseLocalDate('2026-03-13');
    const occurrences: Occurrence[] = [
      {
        id: 'trial:2026-03-13:trial-end',
        item: item({ id: 'trial-item', status: 'trial', trial_end_date: '2026-03-13', start_date: '2026-01-13' }),
        date: trialEndDate,
        isoDate: '2026-03-13',
        amount: 0,
        kind: 'trial-end',
        isPast: false,
        isOverdue: false,
      },
    ];

    const summary = summariseDay(occurrences, createCategoryLookup([]));
    assert.equal(summary.hasTrialEnd, true);
  });

  test('summariseDay chargeCount excludes trial-end markers on a day with both', () => {
    const testDate = parseLocalDate('2026-03-13');
    const occurrences: Occurrence[] = [
      {
        id: 'charge-item:2026-03-13:charge',
        item: item({ id: 'charge-item', amount: 12 }),
        date: testDate,
        isoDate: '2026-03-13',
        amount: 12,
        kind: 'charge',
        isPast: false,
        isOverdue: false,
      },
      {
        id: 'trial-item:2026-03-13:trial-end',
        item: item({
          id: 'trial-item',
          status: 'trial',
          trial_end_date: '2026-03-13',
          start_date: '2026-01-13',
        }),
        date: testDate,
        isoDate: '2026-03-13',
        amount: 0,
        kind: 'trial-end',
        isPast: false,
        isOverdue: false,
      },
    ];

    const summary = summariseDay(occurrences, createCategoryLookup([]));
    // A trial-end marker carries amount 0 and is not a charge — it must not
    // inflate chargeCount, or a day with one real charge plus a trial
    // ending would misreport "2 charges".
    assert.equal(summary.chargeCount, 1);
    assert.equal(summary.total, 12);
    assert.equal(summary.hasTrialEnd, true);
  });

  test('summariseDay uses accentColor fallback when no charges exist', () => {
    const trialEndDate = parseLocalDate('2026-03-13');
    const occurrences: Occurrence[] = [
      {
        id: 'trial:2026-03-13:trial-end',
        item: item({ id: 'trial-item', status: 'trial', trial_end_date: '2026-03-13', start_date: '2026-01-13' }),
        date: trialEndDate,
        isoDate: '2026-03-13',
        amount: 0,
        kind: 'trial-end',
        isPast: false,
        isOverdue: false,
      },
    ];

    const summary = summariseDay(occurrences, createCategoryLookup([]));
    // Should fall back to UNCATEGORIZED_CATEGORY_COLOR since there are no charges
    assert.equal(summary.accentColor, '#6b7280');
  });
});
