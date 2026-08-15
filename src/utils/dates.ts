/**
 * Centralized date utilities for SubTrkr
 * Uses date-fns for reliable, timezone-safe date handling
 */

import {
  format,
  addWeeks,
  addMonths,
  addYears,
  differenceInDays,
  isBefore,
  isToday,
  startOfDay,
  subDays,
} from 'date-fns';
import type { BillingCycle } from '../types';

// ============ Parsing ============

/**
 * Parses a date string (YYYY-MM-DD) into a local Date object.
 * This avoids the timezone bug where '2026-02-18' becomes Feb 17 in local time.
 */
export function parseLocalDate(dateStr: string): Date {
  // Handle ISO strings with time component
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }
  
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Date-only strings (`YYYY-MM-DD`) are local calendar days. Timestamps
 * (`...T...`) are real instants, then the caller decides how to fold them
 * onto a day. Stripping the `T` and keeping the UTC date prefix is wrong
 * for `paused_at` / `cancelled_at` / `archived_at`.
 */
export function parseDateValue(value: string | null | undefined): Date | null {
  if (!value) return null;

  const parsed = value.includes('T') ? new Date(value) : parseLocalDate(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeToStartOfDay(date: Date): Date {
  return startOfDay(date);
}

/**
 * Gets today's date as a local Date object (at start of day)
 */
export function getToday(): Date {
  return startOfDay(new Date());
}

/** Milliseconds until the next local midnight. Always at least 1ms. */
export function msUntilNextLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1, next.getTime() - now.getTime());
}

// ============ Formatting ============

/**
 * Formats a date for display: "Feb 18, 2026"
 */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return format(d, 'MMM d, yyyy');
}

/**
 * Formats a date in short form: "Feb 18"
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return format(d, 'MMM d');
}

/**
 * Formats a date as ISO string for storage/forms: "2026-02-18"
 */
export function formatISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// ============ Calculations ============

/**
 * Adds one billing cycle to a date and returns the new date.
 */
export function addBillingCycle(date: Date, cycle: BillingCycle): Date {
  switch (cycle) {
    case 'weekly':
      return addWeeks(date, 1);
    case 'monthly':
      return addMonths(date, 1);
    case 'quarterly':
      return addMonths(date, 3);
    case 'yearly':
      return addYears(date, 1);
    default:
      return date;
  }
}

/**
 * Calculates the next billing date from a given date and cycle.
 * Returns the ISO date string (YYYY-MM-DD).
 */
export function calculateNextBillingDate(dateStr: string, cycle: BillingCycle): string {
  const date = parseLocalDate(dateStr);
  const nextDate = addBillingCycle(date, cycle);
  return formatISODate(nextDate);
}

/**
 * Calculates the next future billing date from an anchor date (typically start_date).
 * Advances by the billing cycle until the date is strictly after today.
 * 
 * Use this when:
 * - Creating a new item (anchor = start_date)
 * - Changing billing_cycle on an existing item (recalculates from start_date)
 * 
 * @param anchorDateStr - The anchor date (usually start_date) in YYYY-MM-DD format
 * @param cycle - The billing cycle
 * @returns ISO date string (YYYY-MM-DD) of the next future billing date
 */
export function getNextFutureBillingDate(
  anchorDateStr: string,
  cycle: BillingCycle,
  referenceDate: Date = getToday(),
): string {
  const anchor = parseLocalDate(anchorDateStr);

  let nextDate = anchor;

  // Advance until we're strictly in the future relative to referenceDate
  while (nextDate <= referenceDate) {
    nextDate = addBillingCycle(nextDate, cycle);
  }

  return formatISODate(nextDate);
}

/**
 * Calculates the next scheduled billing date on or after a reference date
 * while preserving the original billing anchor.
 */
export function getNextBillingDateOnOrAfter(
  anchorDateStr: string,
  cycle: BillingCycle,
  referenceDateStr: string
): string {
  const anchor = parseLocalDate(anchorDateStr);
  const referenceDate = parseLocalDate(referenceDateStr);

  let nextDate = anchor;

  while (nextDate < referenceDate) {
    nextDate = addBillingCycle(nextDate, cycle);
  }

  return formatISODate(nextDate);
}

/**
 * Gets the number of days until a given date.
 * Returns negative if the date is in the past.
 */
export function getDaysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  const today = getToday();
  return differenceInDays(d, today);
}

/**
 * Checks if a date is overdue (in the past).
 */
export function isOverdue(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return isBefore(d, getToday());
}

/**
 * Checks if a date is due within the specified number of days.
 */
export function isDueWithinDays(date: Date | string, days: number): boolean {
  const daysUntil = getDaysUntil(date);
  return daysUntil >= 0 && daysUntil <= days;
}

/**
 * Checks if a date is today.
 */
export function isDueToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return isToday(d);
}

// ============ Reminder Utilities ============

/**
 * Gets the date when a reminder should be triggered.
 */
export function getReminderDate(billingDate: Date | string, reminderDays: number): Date {
  const d = typeof billingDate === 'string' ? parseLocalDate(billingDate) : billingDate;
  return subDays(d, reminderDays);
}

/**
 * Checks if a reminder should fire today for a given billing date and reminder days setting.
 */
export function shouldRemindToday(billingDate: Date | string, reminderDays: number): boolean {
  if (reminderDays === 0) return false;
  
  const daysUntil = getDaysUntil(billingDate);
  return daysUntil >= 0 && daysUntil <= reminderDays;
}
