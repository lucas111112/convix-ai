export interface CursorPageArgs {
  cursor?: string;
  limit?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export interface OffsetPageArgs {
  page: number;
  limit: number;
}

export interface PageMeta {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PageMeta;
}

/**
 * Builds Prisma query args for cursor-based pagination.
 * Fetches one extra record to determine whether a next page exists.
 */
export function buildCursorPage(args: CursorPageArgs) {
  const limit = Math.min(args.limit ?? 50, 100);
  return {
    take: limit + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    ...(args.orderBy
      ? { orderBy: args.orderBy }
      : { orderBy: { createdAt: 'desc' as const } }),
  };
}

/**
 * Builds Prisma query args for offset-based pagination.
 * Clamps limit to 100 and ensures page is at least 1.
 */
export function buildOffsetPage(args: OffsetPageArgs) {
  const limit = Math.min(args.limit, 100);
  const page = Math.max(args.page, 1);
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Wraps a data array and total count into a PaginatedResult envelope.
 */
export function formatPage<T>(args: {
  data: T[];
  total: number;
  page: number;
  limit: number;
}): PaginatedResult<T> {
  return {
    data: args.data,
    meta: {
      total: args.total,
      page: args.page,
      pages: Math.ceil(args.total / args.limit),
      limit: args.limit,
    },
  };
}

/**
 * Trims the extra record fetched by buildCursorPage and returns
 * the stable data array plus the next cursor (or null if no more pages).
 */
export function buildCursorResponse<T extends { id: string }>(
  items: T[],
  limit: number,
): { data: T[]; nextCursor: string | null } {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;
  return { data, nextCursor };
}
