/**
 * Resolves a shift-click into the inclusive span of ids between the anchor and
 * the target, in current sort order. Falls back to the target alone when the
 * anchor is missing or no longer visible.
 */
export function resolveRangeSelection(
  orderedIds: readonly string[],
  anchorId: string | null,
  targetId: string,
): string[] {
  const targetIndex = orderedIds.indexOf(targetId);
  if (targetIndex === -1) {
    return [];
  }

  const anchorIndex = anchorId ? orderedIds.indexOf(anchorId) : -1;
  if (anchorIndex === -1) {
    return [targetId];
  }

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);

  return orderedIds.slice(start, end + 1);
}
