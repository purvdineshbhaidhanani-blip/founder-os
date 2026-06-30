import { generateId, nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";

/**
 * Company calendar and meeting rituals — standups, retrospectives, decision
 * logs and arbitrary meetings. Each record is immutable once added; lookups
 * support project, kind, and time-range filters.
 */

export type MeetingKind =
  | "standup"
  | "retrospective"
  | "planning"
  | "review"
  | "decision"
  | "1-on-1"
  | "all-hands";

export interface Meeting {
  id: string;
  projectId?: string;
  kind: MeetingKind;
  title: string;
  attendees: string[];
  notes: string;
  scheduledAt: Timestamp;
  durationMinutes: number;
  createdAt: Timestamp;
}

export interface DecisionLogEntry {
  id: string;
  topic: string;
  decision: string;
  rationale: string;
  decidedBy: string;
  decidedAt: Timestamp;
  relatedProjectId?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: Timestamp;
  endsAt: Timestamp;
  participants: string[];
  kind: "meeting" | "milestone" | "deadline" | "release" | "block";
  payload?: unknown;
}

export class CompanyRituals {
  private meetings = new Map<string, Meeting>();
  private decisions = new Map<string, DecisionLogEntry>();
  private calendar = new Map<string, CalendarEvent>();

  schedule(input: Omit<Meeting, "id" | "createdAt">): Meeting {
    const meeting: Meeting = { id: generateId("mtg"), createdAt: nowIso(), ...input };
    this.meetings.set(meeting.id, meeting);
    this.addCalendarEvent({
      title: meeting.title,
      startsAt: meeting.scheduledAt,
      endsAt: new Date(Date.parse(meeting.scheduledAt) + meeting.durationMinutes * 60_000).toISOString(),
      participants: meeting.attendees,
      kind: "meeting",
      payload: { meetingId: meeting.id },
    });
    return meeting;
  }

  standup(input: { projectId: string; attendees: string[]; notes: string; durationMinutes?: number }): Meeting {
    return this.schedule({
      kind: "standup",
      projectId: input.projectId,
      title: `Standup — ${input.projectId}`,
      attendees: input.attendees,
      notes: input.notes,
      scheduledAt: nowIso(),
      durationMinutes: input.durationMinutes ?? 15,
    });
  }

  retrospective(input: { projectId: string; attendees: string[]; notes: string }): Meeting {
    return this.schedule({
      kind: "retrospective",
      projectId: input.projectId,
      title: `Retrospective — ${input.projectId}`,
      attendees: input.attendees,
      notes: input.notes,
      scheduledAt: nowIso(),
      durationMinutes: 60,
    });
  }

  logDecision(input: Omit<DecisionLogEntry, "id" | "decidedAt"> & { decidedAt?: Timestamp }): DecisionLogEntry {
    const entry: DecisionLogEntry = {
      id: generateId("decision"),
      decidedAt: input.decidedAt ?? nowIso(),
      ...input,
    };
    this.decisions.set(entry.id, entry);
    return entry;
  }

  addCalendarEvent(input: Omit<CalendarEvent, "id">): CalendarEvent {
    const event: CalendarEvent = { id: generateId("evt"), ...input };
    this.calendar.set(event.id, event);
    return event;
  }

  listMeetings(filter?: { projectId?: string; kind?: MeetingKind }): Meeting[] {
    let all = [...this.meetings.values()];
    if (filter?.projectId) all = all.filter((m) => m.projectId === filter.projectId);
    if (filter?.kind) all = all.filter((m) => m.kind === filter.kind);
    return all.sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt));
  }

  listDecisions(filter?: { projectId?: string }): DecisionLogEntry[] {
    const all = [...this.decisions.values()];
    const filtered = filter?.projectId
      ? all.filter((d) => d.relatedProjectId === filter.projectId)
      : all;
    return filtered.sort((a, b) => Date.parse(b.decidedAt) - Date.parse(a.decidedAt));
  }

  upcomingEvents(now: Timestamp = nowIso(), limit = 20): CalendarEvent[] {
    const nowMs = Date.parse(now);
    return [...this.calendar.values()]
      .filter((event) => Date.parse(event.startsAt) >= nowMs)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
      .slice(0, limit);
  }
}
