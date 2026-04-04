import type { StatusHistory } from '@/types';

const LEGACY_PREFIX = '__subtrkr_meta__:';

interface LegacyStatusHistoryMetadata {
  action: string;
  effectiveDate?: string | null;
}

function parseLegacyStatusHistoryMetadata(notes: string | null): LegacyStatusHistoryMetadata | null {
  if (!notes || !notes.startsWith(LEGACY_PREFIX)) {
    return null;
  }

  const metadataLine = notes.split('\n', 1)[0] ?? '';
  const rawMetadata = metadataLine.slice(LEGACY_PREFIX.length);

  try {
    return JSON.parse(rawMetadata) as LegacyStatusHistoryMetadata;
  } catch {
    return null;
  }
}

function trimNotes(notes: string | null): string | null {
  if (!notes) return null;

  const trimmed = notes.trim();
  return trimmed ? trimmed : null;
}

export function getResolvedStatusHistoryAction(entry: StatusHistory): string | null {
  return entry.action || parseLegacyStatusHistoryMetadata(entry.notes)?.action || null;
}

export function getResolvedStatusHistoryEffectiveDate(entry: StatusHistory): string | null {
  return entry.effective_date || parseLegacyStatusHistoryMetadata(entry.notes)?.effectiveDate || null;
}

export function getResolvedStatusHistoryNotes(entry: StatusHistory): string | null {
  if (!entry.notes) {
    return null;
  }

  if (!entry.notes.startsWith(LEGACY_PREFIX)) {
    return trimNotes(entry.notes);
  }

  const parts = entry.notes.split('\n');
  if (parts.length < 2) {
    return null;
  }

  return trimNotes(parts.slice(1).join('\n'));
}
