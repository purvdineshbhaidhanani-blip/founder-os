import { z } from "zod";

/**
 * Cursor pagination per standards/api.md: `{ data: [...], pagination:
 * { nextCursor, hasMore } }`, server-capped limit regardless of what the
 * client requests. This is the one implementation every product's list
 * endpoint uses — previously hand-rolled per-query (see
 * organizations/service.ts, audit/index.ts before this module existed).
 */

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationEnvelope {
  nextCursor?: string;
  hasMore: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationEnvelope;
}

export function resolveLimit(requested?: number): number {
  return Math.min(requested ?? DEFAULT_LIMIT, MAX_LIMIT);
}

/**
 * Fetches one page from a Prisma-style `findMany` by over-fetching one
 * extra row to detect `hasMore`, then trims it off — the standard
 * cursor-pagination trick, implemented once instead of per query site.
 *
 * `findMany` should be called with `take: limit + 1` and, when a cursor is
 * supplied, `cursor: { id: cursor }, skip: 1`.
 */
export async function paginate<T extends { id: string }>(params: {
  cursor?: string;
  limit?: number;
  findMany: (args: { take: number; cursor?: { id: string }; skip?: number }) => Promise<T[]>;
}): Promise<PaginatedResult<T>> {
  const limit = resolveLimit(params.limit);
  const rows = await params.findMany({
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    data: page,
    pagination: {
      hasMore,
      ...(hasMore ? { nextCursor: page[page.length - 1]?.id } : {}),
    },
  };
}
