/**
 * Performance & Caching Utilities
 * 
 * Provides helpers for optimizing API responses, caching,
 * request deduplication, and reducing database load.
 */

import { NextResponse } from 'next/server';

/**
 * Cache decorator with TTL
 * 
 * Usage:
 * const cachedGetMenu = withCache(getMenu, 'menu_', 30 * 60);
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyPrefix: string,
  ttlSeconds: number = 60
) {
  const cache = new Map<string, { data: any; expiry: number }>();

  return async function cachedFn(...args: any[]) {
    const key = `${keyPrefix}${JSON.stringify(args)}`;

    // Check cache
    const cached = cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // Call function and cache result
    const result = await fn(...args);
    cache.set(key, {
      data: result,
      expiry: Date.now() + ttlSeconds * 1000,
    });

    return result;
  } as T;
}

/**
 * Add caching headers to response
 * 
 * Usage:
 * return withCacheHeaders(
 *   NextResponse.json(data),
 *   'public', 
 *   300  // 5 minutes
 * );
 */
export function withCacheHeaders(
  response: NextResponse,
  visibility: 'public' | 'private' = 'public',
  maxAge: number = 60
) {
  response.headers.set(
    'Cache-Control',
    `${visibility}, max-age=${maxAge}, s-maxage=${maxAge}`
  );
  return response;
}

/**
 * Rate limit tracking by key
 * 
 * Usage:
 * checkRateLimit('user_123', 100, 3600) // 100 requests per hour
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const bucket = rateLimitMap.get(key);

  if (!bucket || bucket.resetTime < now) {
    // New bucket or expired
    rateLimitMap.set(key, { count: 1, resetTime: now + windowSeconds * 1000 });
    return { remaining: limit - 1, resetIn: windowSeconds };
  }

  if (bucket.count >= limit) {
    return {
      limited: true,
      resetIn: Math.ceil((bucket.resetTime - now) / 1000),
    };
  }

  bucket.count++;
  return {
    remaining: limit - bucket.count,
    resetIn: Math.ceil((bucket.resetTime - now) / 1000),
  };
}

/**
 * Batch similar requests to avoid duplicate database queries
 * 
 * Usage:
 * const getMenuBatches = withRequestDedup((ids: string[]) => 
 *   db.collection('menus').find({ itemId: { $in: ids } }).toArray()
 * );
 */
export function withRequestDedup<T>(
  fn: (args: any[]) => Promise<T>
) {
  const pending = new Map<string, Promise<T>>();

  return async function deDupedFn(...args: any[]): Promise<T> {
    const key = JSON.stringify(args);

    // Return existing promise if one is already pending
    if (pending.has(key)) {
      return pending.get(key)!;
    }

    // Create and store the promise
    const promise = fn(args).finally(() => {
      pending.delete(key);
    });

    pending.set(key, promise);
    return promise;
  };
}

/**
 * Compress response data
 * 
 * Usage:
 * const compressed = compressResponse(largeData);
 */
export function compressResponse(data: any) {
  const json = JSON.stringify(data);
  const size = Buffer.byteLength(json);
  
  return {
    size,
    compressed: size > 1000, // Report if > 1KB for optimization
    data,
  };
}

/**
 * Pagination helper
 * 
 * Usage:
 * const { skip, limit } = getPaginationParams(req, defaultLimit=20)
 */
export function getPaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = 20
) {
  const skip = Math.max(0, parseInt(searchParams.get('skip') || '0'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit))));

  return { skip, limit };
}

/**
 * Connection pooling indicator
 * 
 * Monitors MongoDB connection health
 */
export class ConnectionHealthCheck {
  private static lastCheck = 0;
  private static isHealthy = true;

  static async check(db: any): Promise<boolean> {
    const now = Date.now();
    
    // Check once per minute
    if (now - this.lastCheck < 60000) {
      return this.isHealthy;
    }

    try {
      await db.admin().ping();
      this.isHealthy = true;
    } catch (error) {
      this.isHealthy = false;
      console.error('Database health check failed:', error);
    }

    this.lastCheck = now;
    return this.isHealthy;
  }

  static getStatus() {
    return {
      healthy: this.isHealthy,
      lastCheck: new Date(this.lastCheck).toISOString(),
    };
  }
}

/**
 * Timing utility for performance profiling
 * 
 * Usage:
 * const timer = new PerformanceTimer('fetch_orders');
 * // ... do work
 * console.log(timer.end());
 */
export class PerformanceTimer {
  private start: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.start = performance.now();
  }

  end() {
    const duration = performance.now() - this.start;
    const color = duration < 50 ? 'green' : duration < 200 ? 'yellow' : 'red';
    
    return {
      name: this.name,
      duration: `${duration.toFixed(2)}ms`,
      color,
      slow: duration > 200,
    };
  }

  log() {
    console.log(`⏱️  ${this.name}: ${this.end().duration}`);
  }
}

