import { interpolate, type InterpolateOptions } from "../shared/interpolate.js";

export interface PromptTemplate {
  id: string;
  version: string;
  /** Template body with `{{variable}}` placeholders. */
  template: string;
  description?: string;
}

/**
 * Registers and renders versioned prompt templates. Keeping prompts as data
 * (rather than inline string literals scattered through call sites) is what
 * lets them be edited, A/B tested, and audited independent of code.
 */
export class PromptManager {
  private readonly templates = new Map<string, PromptTemplate>();

  private key(id: string, version: string): string {
    return `${id}@${version}`;
  }

  register(template: PromptTemplate): void {
    this.templates.set(this.key(template.id, template.version), template);
  }

  get(id: string, version: string): PromptTemplate | undefined {
    return this.templates.get(this.key(id, version));
  }

  latest(id: string): PromptTemplate | undefined {
    const matches = [...this.templates.values()].filter((t) => t.id === id);
    if (matches.length === 0) return undefined;
    return matches.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0];
  }

  render(
    template: PromptTemplate,
    variables: Record<string, unknown>,
    options: InterpolateOptions = {},
  ): string {
    return interpolate(template.template, variables, options);
  }

  renderById(
    id: string,
    variables: Record<string, unknown>,
    options: InterpolateOptions & { version?: string } = {},
  ): string {
    const template = options.version ? this.get(id, options.version) : this.latest(id);
    if (!template) throw new Error(`No prompt template registered for id "${id}".`);
    return this.render(template, variables, options);
  }
}
