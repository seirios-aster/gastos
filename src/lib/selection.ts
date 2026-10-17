/** Add the id if it is not picked yet, remove it if it is. The list it is given is not changed. */
export function toggleId(ids: readonly number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/**
 * Keep only the ids that still exist (an item may be deleted or changed while others are picked),
 * in the order they were picked.
 */
export function pruneIds(ids: readonly number[], existing: Iterable<number>): number[] {
  const live = new Set(existing);
  return ids.filter((id) => live.has(id));
}
