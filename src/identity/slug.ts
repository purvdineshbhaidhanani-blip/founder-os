import type { IdentityStore } from "./store.js";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "org";
}

/** Generates a unique organization slug from a display name, appending `-2`, `-3`, ... on collision. */
export async function generateUniqueOrganizationSlug(store: IdentityStore, name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (await store.getOrganizationBySlug(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
