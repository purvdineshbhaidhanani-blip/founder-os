import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { ModuleRegistry } from "../modules/registry.js";
import type { PlatformModule } from "../modules/types.js";
import { resolveEffectiveModules } from "../product/resolve-modules.js";
import type { ProductDefinition } from "../product/types.js";

const EXPORT_PATTERN = /export\s+(?:declare\s+)?(?:class|function|interface|type|const|enum)\s+([A-Za-z0-9_]+)/g;

function listTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTsFiles(fullPath);
    return entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

/** Regex-scans a module's source for top-level exports — a real (if shallow) API surface, not a hand-maintained list that drifts. */
function extractExportedSymbols(sourcePath: string | undefined, platformRoot: string): string[] {
  if (!sourcePath) return [];
  const resolvedPath = path.join(platformRoot, sourcePath);
  if (!existsSync(resolvedPath)) return [];

  const files = statSync(resolvedPath).isDirectory() ? listTsFiles(resolvedPath) : [resolvedPath];
  const symbols = new Set<string>();
  for (const file of files) {
    const source = readFileSync(file, "utf-8");
    for (const match of source.matchAll(EXPORT_PATTERN)) symbols.add(match[1]!);
  }
  return [...symbols].sort();
}

function moduleDocMarkdown(module: PlatformModule, platformRoot: string): string {
  const exported = extractExportedSymbols(module.sourcePath, platformRoot);
  const lines = [
    `# ${module.name}`,
    "",
    module.description,
    "",
    `- **Id**: \`${module.id}\``,
    `- **Category**: \`${module.category}\``,
    module.dependsOn?.length ? `- **Depends on**: ${module.dependsOn.map((d) => `\`${d}\``).join(", ")}` : undefined,
    module.sourcePath ? `- **Source**: \`${module.sourcePath}\`` : undefined,
    "",
  ].filter((line): line is string => line !== undefined);

  if (exported.length > 0) {
    lines.push("## Public API", "", ...exported.map((symbol) => `- \`${symbol}\``), "");
  }

  return lines.join("\n");
}

/**
 * Generates developer, API-reference, and per-module documentation from a
 * `ModuleRegistry` (and optionally a `ProductDefinition`). Module docs are
 * grounded in the module's actual declared exports where its source is
 * reachable, rather than being purely hand-authored prose that drifts from
 * the code.
 */
export class DocumentationGenerator {
  generateModuleDocs(registry: ModuleRegistry, platformRoot: string = process.cwd()): Record<string, string> {
    const docs: Record<string, string> = {};
    for (const module of registry.list()) {
      docs[module.id] = moduleDocMarkdown(module, platformRoot);
    }
    return docs;
  }

  generateApiReference(registry: ModuleRegistry, platformRoot: string = process.cwd()): string {
    const byCategory = new Map<string, PlatformModule[]>();
    for (const module of registry.list()) {
      const list = byCategory.get(module.category) ?? [];
      list.push(module);
      byCategory.set(module.category, list);
    }

    const sections = [...byCategory.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, modules]) => {
        const entries = modules
          .map((module) => {
            const exported = extractExportedSymbols(module.sourcePath, platformRoot);
            const symbolList = exported.length > 0 ? exported.map((s) => `\`${s}\``).join(", ") : "_(no source scanned)_";
            return `### ${module.name} (\`${module.id}\`)\n\n${module.description}\n\n**Exports**: ${symbolList}`;
          })
          .join("\n\n");
        return `## ${category}\n\n${entries}`;
      });

    return ["# API Reference", "", ...sections].join("\n\n");
  }

  generateDeveloperGuide(definition: ProductDefinition, registry: ModuleRegistry): string {
    const effective = resolveEffectiveModules(definition);
    const { order, validation } = registry.resolveRequired(effective);
    const modules = order.map((id) => registry.get(id)).filter((m): m is PlatformModule => m !== undefined);

    const lines = [
      `# ${definition.name} — Developer Guide`,
      "",
      `${definition.description ?? `A ${definition.type} product.`}`,
      "",
      "## Modules used, in dependency order",
      "",
      ...modules.map((m, i) => `${i + 1}. **${m.name}** (\`${m.id}\`) — ${m.description}`),
    ];

    if (!validation.valid) {
      lines.push("", "## ⚠ Unresolved dependency issues", "", ...validation.issues.map((issue) => `- ${issue.detail}`));
    }

    return lines.join("\n");
  }

  generate(
    definition: ProductDefinition,
    registry: ModuleRegistry,
    platformRoot: string = process.cwd(),
  ): { developerGuide: string; apiReference: string; moduleDocs: Record<string, string> } {
    return {
      developerGuide: this.generateDeveloperGuide(definition, registry),
      apiReference: this.generateApiReference(registry, platformRoot),
      moduleDocs: this.generateModuleDocs(registry, platformRoot),
    };
  }
}
