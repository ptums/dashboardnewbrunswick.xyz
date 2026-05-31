import NodeCache from 'node-cache';
import * as Sentry from '@sentry/node';
import { db } from '../db';
import { dataSnapshots } from '../db/schema';
import { eq, and, gt, isNull, desc } from 'drizzle-orm';

const memCache = new NodeCache();

function cacheKey(category: string, source: string): string {
  return `${category}:${source}`;
}

export async function fetchWithCache<T>(
  category: string,
  source: string,
  fetcher: () => Promise<T>,
  ttlDays: number,
): Promise<T> {
  const key = cacheKey(category, source);

  // 1. In-memory cache hit
  const cached = memCache.get<T>(key);
  if (cached !== undefined) return cached;

  const now = new Date();

  // 2. DB fresh snapshot
  const [fresh] = await db
    .select()
    .from(dataSnapshots)
    .where(
      and(
        eq(dataSnapshots.category, category),
        eq(dataSnapshots.source, source),
        gt(dataSnapshots.expiresAt, now),
        isNull(dataSnapshots.deletedAt),
      ),
    )
    .orderBy(desc(dataSnapshots.fetchedAt))
    .limit(1);

  if (fresh) {
    const data = fresh.data as T;
    const remainingSec = Math.floor((fresh.expiresAt.getTime() - now.getTime()) / 1000);
    if (remainingSec > 0) memCache.set(key, data, remainingSec);
    return data;
  }

  // 3. Fetch from external API
  try {
    const data = await fetcher();
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

    await db.insert(dataSnapshots).values({
      category,
      source,
      data: data as unknown,
      expiresAt,
    });

    memCache.set(key, data, ttlDays * 24 * 60 * 60);
    return data;
  } catch (err) {
    Sentry.captureException(err, { tags: { category, source } });

    // 4. Fall back to last known good (stale is better than nothing)
    const [stale] = await db
      .select()
      .from(dataSnapshots)
      .where(
        and(
          eq(dataSnapshots.category, category),
          eq(dataSnapshots.source, source),
          isNull(dataSnapshots.deletedAt),
        ),
      )
      .orderBy(desc(dataSnapshots.fetchedAt))
      .limit(1);

    if (stale) return stale.data as T;

    // No cached data at all — surface to caller so route can return 503
    throw err;
  }
}
