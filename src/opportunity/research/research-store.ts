import type { ResearchSession } from "./types.js";

// ---------------------------------------------------------------------------
// Research Store — in-memory store for ResearchSessions
// ---------------------------------------------------------------------------

export class ResearchStore {
  private readonly sessions = new Map<string, ResearchSession>();

  save(session: ResearchSession): void {
    this.sessions.set(session.sessionId, session);
  }

  get(sessionId: string): ResearchSession | undefined {
    return this.sessions.get(sessionId);
  }

  list(): ResearchSession[] {
    return [...this.sessions.values()].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  }

  latest(): ResearchSession | undefined {
    return this.list()[0];
  }

  completed(): ResearchSession[] {
    return this.list().filter((s) => s.status === "completed" || s.status === "partial");
  }

  size(): number {
    return this.sessions.size;
  }

  clear(): void {
    this.sessions.clear();
  }
}
