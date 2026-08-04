export interface BulkResult {
  /** ids that were actually mutated */
  succeeded: string[];
  /** ids that were attempted and errored */
  failed: { id: string; error: string }[];
  /** ids that were selected but ineligible, so never attempted */
  skipped: string[];
}

export interface BulkCopy {
  /** "Deleted", "Paused", "Cancelled" */
  pastTense: string;
  /** bare verb used in the total-failure message: "delete", "pause" */
  failedVerb: string;
  singular: string;
  plural: string;
}

export interface BulkSummary {
  message: string;
  tone: 'success' | 'error';
}

export function emptyBulkResult(): BulkResult {
  return { succeeded: [], failed: [], skipped: [] };
}

export function summarizeBulkResult(
  result: BulkResult,
  copy: BulkCopy,
): BulkSummary | null {
  const successCount = result.succeeded.length;
  const failureCount = result.failed.length;
  const skippedCount = result.skipped.length;

  if (successCount === 0 && failureCount === 0 && skippedCount === 0) {
    return null;
  }

  if (successCount === 0 && failureCount === 0 && skippedCount > 0) {
    return {
      message: `Nothing to do — ${skippedCount} skipped`,
      tone: 'success',
    };
  }

  const suffix = skippedCount > 0 ? ` · ${skippedCount} skipped` : '';

  if (successCount === 0 && failureCount > 0) {
    return {
      message: `Couldn't ${copy.failedVerb}. Please try again.${suffix}`,
      tone: 'error',
    };
  }

  if (failureCount > 0) {
    return {
      message: `${copy.pastTense} ${successCount} — ${failureCount} failed${suffix}`,
      tone: 'error',
    };
  }

  const noun = successCount === 1 ? copy.singular : copy.plural;

  return {
    message: `${copy.pastTense} ${successCount} ${noun}${suffix}`,
    tone: 'success',
  };
}
