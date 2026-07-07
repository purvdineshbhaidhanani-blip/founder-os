import type { DecisionHistoryFilter, DecisionRecord } from "./types.js";

export interface DecisionHistoryStore {
  record(entry: DecisionRecord): Promise<void> | void;
  list(filter?: DecisionHistoryFilter): Promise<DecisionRecord[]> | DecisionRecord[];
}

/** In-memory decision history — swap for a persisted store via the same interface without touching the Decision Engine. */
export class InMemoryDecisionHistoryStore implements DecisionHistoryStore {
  private readonly entries: DecisionRecord[] = [];

  record(entry: DecisionRecord): void {
    this.entries.push(entry);
  }

  list(filter: DecisionHistoryFilter = {}): DecisionRecord[] {
    let results = [...this.entries];
    if (filter.label) results = results.filter((e) => e.label === filter.label);
    if (filter.since) results = results.filter((e) => e.timestamp >= filter.since!);
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return filter.limit ? results.slice(0, filter.limit) : results;
  }
}
