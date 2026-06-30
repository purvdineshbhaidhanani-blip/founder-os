import { generateId, nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";
import type { WorkflowDefinition } from "../runtime/workflow/types.js";
import { contentHash } from "../utils/hash.js";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  createdAt: Timestamp;
  /** Returns a fresh, runnable WorkflowDefinition given simple parameters. */
  build: (input: WorkflowTemplateInput) => WorkflowDefinition;
}

export interface WorkflowTemplateInput {
  goal: string;
  ownerAgent?: string;
  context?: Record<string, unknown>;
}

export interface WorkflowAnalyticsRecord {
  templateId: string;
  invocations: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
}

export interface WorkflowVersion {
  templateId: string;
  version: string;
  hash: string;
  capturedAt: Timestamp;
}

/**
 * Workflow Library — the registry/marketplace/analytics surface for reusable
 * workflow templates. The Workflow Generator produces a WorkflowDefinition;
 * this layer stores reusable templates and tracks their performance.
 */
export class WorkflowLibrary {
  private templates = new Map<string, WorkflowTemplate>();
  private versions = new Map<string, WorkflowVersion[]>();
  private analytics = new Map<string, WorkflowAnalyticsRecord>();

  register(template: Omit<WorkflowTemplate, "id" | "createdAt"> & { id?: string }): WorkflowTemplate {
    const id = template.id ?? generateId("wftpl");
    const stored: WorkflowTemplate = {
      id,
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      version: template.version,
      createdAt: nowIso(),
      build: template.build,
    };
    this.templates.set(id, stored);
    this.captureVersion(stored);
    return stored;
  }

  list(): WorkflowTemplate[] { return [...this.templates.values()]; }
  get(id: string): WorkflowTemplate | undefined { return this.templates.get(id); }

  search(query: { tag?: string; category?: string; text?: string }): WorkflowTemplate[] {
    return this.list().filter((template) => {
      if (query.tag && !template.tags.includes(query.tag)) return false;
      if (query.category && template.category !== query.category) return false;
      if (query.text) {
        const needle = query.text.toLowerCase();
        const haystack = `${template.name} ${template.description}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }

  /** Generate (build) a runnable WorkflowDefinition from a template. */
  build(templateId: string, input: WorkflowTemplateInput): WorkflowDefinition {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Unknown workflow template "${templateId}"`);
    return template.build(input);
  }

  /** Optimize: prefer templates with the highest historical success rate. */
  optimize(query: { tag?: string; category?: string; text?: string }): WorkflowTemplate[] {
    const candidates = this.search(query);
    return [...candidates].sort((a, b) => {
      const av = this.viewAnalytics(a.id);
      const bv = this.viewAnalytics(b.id);
      const aRate = av?.successRate ?? 0;
      const bRate = bv?.successRate ?? 0;
      return bRate - aRate;
    });
  }

  /** Update a template; captures a new version row. */
  updateVersion(templateId: string, version: string, builder?: WorkflowTemplate["build"]): WorkflowTemplate {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Unknown workflow template "${templateId}"`);
    template.version = version;
    if (builder) template.build = builder;
    this.captureVersion(template);
    return template;
  }

  recordInvocation(templateId: string, ok: boolean, durationMs: number): void {
    const record = this.analytics.get(templateId) ?? {
      templateId,
      invocations: 0,
      successCount: 0,
      failureCount: 0,
      totalDurationMs: 0,
    };
    record.invocations += 1;
    if (ok) record.successCount += 1;
    else record.failureCount += 1;
    record.totalDurationMs += durationMs;
    this.analytics.set(templateId, record);
  }

  viewAnalytics(templateId: string): (WorkflowAnalyticsRecord & { successRate: number; averageDurationMs: number }) | undefined {
    const record = this.analytics.get(templateId);
    if (!record) return undefined;
    const total = record.invocations || 1;
    return {
      ...record,
      successRate: record.successCount / total,
      averageDurationMs: record.totalDurationMs / total,
    };
  }

  versionsOf(templateId: string): WorkflowVersion[] {
    return this.versions.get(templateId) ?? [];
  }

  private captureVersion(template: WorkflowTemplate): void {
    const version: WorkflowVersion = {
      templateId: template.id,
      version: template.version,
      hash: contentHash({ name: template.name, version: template.version, description: template.description }),
      capturedAt: nowIso(),
    };
    const existing = this.versions.get(template.id) ?? [];
    existing.push(version);
    this.versions.set(template.id, existing);
  }
}
