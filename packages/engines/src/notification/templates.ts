import { interpolate } from "@platform/shared";
import type { NotificationTemplate } from "./types.js";

export interface RenderedNotification {
  subject?: string;
  body: string;
}

/** Registers versioned notification templates and renders them against a variable bag. */
export class NotificationTemplateRegistry {
  private readonly templates = new Map<string, NotificationTemplate>();

  private key(id: string, version: string): string {
    return `${id}@${version}`;
  }

  register(template: NotificationTemplate): void {
    this.templates.set(this.key(template.id, template.version), template);
  }

  latest(id: string): NotificationTemplate | undefined {
    const matches = [...this.templates.values()].filter((t) => t.id === id);
    if (matches.length === 0) return undefined;
    return matches.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0];
  }

  render(template: NotificationTemplate, variables: Record<string, unknown>): RenderedNotification {
    return {
      subject: template.subjectTemplate
        ? interpolate(template.subjectTemplate, variables, { strict: false })
        : undefined,
      body: interpolate(template.bodyTemplate, variables, { strict: false }),
    };
  }

  renderById(id: string, variables: Record<string, unknown>, version?: string): RenderedNotification {
    const template = version ? this.templates.get(this.key(id, version)) : this.latest(id);
    if (!template) throw new Error(`No notification template registered for id "${id}".`);
    return this.render(template, variables);
  }
}
