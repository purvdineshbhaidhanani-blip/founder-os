import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Repository root, resolved relative to this compiled module (src/constants -> repo root). */
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

export const PATHS = {
  root: REPO_ROOT,
  agentsOutputDir: path.join(REPO_ROOT, ".claude", "agents"),
  blueprintsDir: path.join(REPO_ROOT, "blueprints"),
  blueprintExamplesDir: path.join(REPO_ROOT, "blueprints", "examples"),
  registryDir: path.join(REPO_ROOT, "registry"),
  registryFile: path.join(REPO_ROOT, "registry", "agents.registry.json"),
  docsDir: path.join(REPO_ROOT, "docs"),
} as const;
