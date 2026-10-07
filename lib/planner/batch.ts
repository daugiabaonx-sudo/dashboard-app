// lib/planner/batch.ts
// Run an async function over items in fixed-size parallel batches — keeps
// fan-out to Microsoft Graph well under its throttling limits.

export async function mapInBatches<T, R>(
  items: readonly T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  let out: readonly R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.all(items.slice(i, i + size).map(fn));
    out = [...out, ...batch];
  }
  return [...out];
}
