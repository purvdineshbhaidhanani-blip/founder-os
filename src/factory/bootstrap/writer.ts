import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectPlan } from "./types.js";

/** Materializes a `ProjectPlan` somewhere. Swap in a different writer (a zip archive, a remote repo, an in-memory fixture for tests) via the same interface. */
export interface ProjectWriter {
  write(plan: ProjectPlan, targetDir: string): Promise<void>;
}

/** Writes a `ProjectPlan` to local disk — the default writer for scaffolding a new product's repository. */
export class FsProjectWriter implements ProjectWriter {
  async write(plan: ProjectPlan, targetDir: string): Promise<void> {
    await mkdir(targetDir, { recursive: true });
    for (const dir of plan.directories) {
      await mkdir(path.join(targetDir, dir), { recursive: true });
    }
    for (const file of plan.files) {
      const filePath = path.join(targetDir, file.path);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, file.content, "utf-8");
    }
  }
}
