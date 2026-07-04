import type { ChangeEvent, MonitorSnapshot, MonitorSnapshotItem } from "./types.js";

/**
 * Pure diff engine: "what changed since last check". Deliberately has no I/O
 * of any kind — callers own fetching/persisting snapshots; this module only
 * compares two of them (both plain in-memory data, no database) and returns
 * typed `ChangeEvent`s.
 *
 * First-run handling: when `previous` is `undefined` (no snapshot exists
 * yet at all — this is the very first check for this provider/query pair)
 * there is nothing to diff against, so this returns `[]` rather than
 * reporting every current item as "added". That distinction matters: an
 * explicit empty snapshot (`{ ..., items: [] }`, e.g. a previous check that
 * legitimately found zero items) DOES have current items reported as
 * `"added"`, since a real prior state to compare against exists.
 */
export function diffSnapshots(previous: MonitorSnapshot | undefined, current: MonitorSnapshot): ChangeEvent[] {
  if (previous === undefined) return [];

  // Defensive guard: snapshots are plain data a caller persists/loads between
  // checks (see module doc above) — a truncated or old-schema on-disk
  // snapshot could arrive here missing `items`. Degrade to "nothing to
  // compare" rather than throwing and crashing the whole polling loop.
  const previousItems = Array.isArray(previous.items) ? previous.items : [];
  const currentItems = Array.isArray(current.items) ? current.items : [];

  const events: ChangeEvent[] = [];
  const previousById = new Map<string, MonitorSnapshotItem>(previousItems.map((item) => [item.id, item]));
  const currentById = new Map<string, MonitorSnapshotItem>(currentItems.map((item) => [item.id, item]));

  for (const [id, currentItem] of currentById) {
    const previousItem = previousById.get(id);
    if (!previousItem) {
      events.push({
        type: "added",
        itemId: id,
        title: currentItem.title,
        url: currentItem.url,
        sourceId: currentItem.sourceId,
      });
      continue;
    }
    events.push(...diffItemFields(previousItem, currentItem));
  }

  for (const [id, previousItem] of previousById) {
    if (!currentById.has(id)) {
      events.push({
        type: "removed",
        itemId: id,
        title: previousItem.title,
        url: previousItem.url,
        sourceId: previousItem.sourceId,
      });
    }
  }

  return events;
}

/**
 * Shallow, strict-equality field comparison between two observations of the
 * "same" item (same `id`). Compares `title`/`url` plus every key present in
 * either item's `fields` map (e.g. `price`, `stars`, `points`) — one
 * `"changed"` event per differing field, naming the field via
 * `ChangeEvent.field`.
 */
function diffItemFields(previousItem: MonitorSnapshotItem, currentItem: MonitorSnapshotItem): ChangeEvent[] {
  const events: ChangeEvent[] = [];
  const previousComparable: Record<string, string | number | boolean | undefined> = {
    title: previousItem.title,
    url: previousItem.url,
    ...previousItem.fields,
  };
  const currentComparable: Record<string, string | number | boolean | undefined> = {
    title: currentItem.title,
    url: currentItem.url,
    ...currentItem.fields,
  };

  const allKeys = new Set<string>([...Object.keys(previousComparable), ...Object.keys(currentComparable)]);
  for (const key of allKeys) {
    const previousValue = previousComparable[key];
    const currentValue = currentComparable[key];
    if (previousValue === currentValue) continue;
    events.push({
      type: "changed",
      itemId: currentItem.id,
      title: currentItem.title,
      url: currentItem.url,
      sourceId: currentItem.sourceId,
      field: key,
      previousValue,
      currentValue,
    });
  }

  return events;
}
