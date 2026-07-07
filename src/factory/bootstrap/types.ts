export interface PlannedFile {
  /** Path relative to the project root, e.g. "src/index.ts". */
  path: string;
  content: string;
}

export interface ProjectPlan {
  productName: string;
  directories: string[];
  files: PlannedFile[];
  /** Dependency-first order of every platform module this product resolves to. */
  moduleOrder: string[];
}
