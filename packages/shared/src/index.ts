/**
 * @platform/shared — cross-cutting primitives used by more than one platform
 * package (engines, factory, intelligence): cron parsing/scheduling,
 * retry/backoff, template interpolation, dependency-graph validation, a
 * small validation-result vocabulary, confidence scoring, and priority
 * ranking. Each was originally duplicated per-package as an internal
 * `shared/` folder; consolidated here so there is exactly one
 * implementation of each algorithm across the whole platform.
 */
export * from "./cron.js";
export * from "./schedule.js";
export * from "./retry.js";
export * from "./timeout.js";
export * from "./http-health.js";
export * from "./interpolate.js";
export * from "./dependency-graph.js";
export * from "./validation.js";
export * from "./confidence.js";
export * from "./ranking.js";
export * from "./ai-text-generator.js";
