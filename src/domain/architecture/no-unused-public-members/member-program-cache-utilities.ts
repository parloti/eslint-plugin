import type * as ts from "typescript";

interface ProgramCacheEntry {
  cacheKey: string;
  value: unknown;
}

interface ProgramCaches {
  latest?: WeakRef<ts.Program>;
  values: WeakMap<ts.Program, Map<string, ProgramCacheEntry>>;
}

const programCaches: ProgramCaches = { values: new WeakMap() };

/**
 * Gets one cached analysis value for the most recently used TypeScript program.
 * @param program TypeScript program owning the analysis.
 * @param cacheName Name of the analysis cache.
 * @param cacheKey Options that determine the cached value.
 * @returns Cached analysis value when present.
 * @example
 * ```typescript
 * const index = getMemberProgramCache(program, "usage", key) as
 *   | ProductionUsageIndex
 *   | undefined;
 * ```
 */
const getMemberProgramCache = (
  program: ts.Program,
  cacheName: string,
  cacheKey: string,
): unknown => {
  const entry = programCaches.values.get(program)?.get(cacheName);

  return entry?.cacheKey === cacheKey ? entry.value : void 0;
};

/**
 * Weakly owns analysis values while evicting the previous Program's caches.
 * @param program TypeScript program owning the analysis.
 * @param cacheName Name of the analysis cache.
 * @param cacheKey Options that determine the cached value.
 * @param value Analysis value to cache.
 * @example
 * ```typescript
 * setMemberProgramCache(program, "usage", key, index);
 * ```
 */
const setMemberProgramCache = (
  program: ts.Program,
  cacheName: string,
  cacheKey: string,
  value: unknown,
): void => {
  const previous = programCaches.latest?.deref();
  if (previous !== program) {
    if (previous !== void 0) {
      programCaches.values.delete(previous);
    }
    programCaches.latest = new WeakRef(program);
  }
  let caches = programCaches.values.get(program);

  if (caches === void 0) {
    caches = new Map();
    programCaches.values.set(program, caches);
  }

  caches.set(cacheName, { cacheKey, value });
};

export { getMemberProgramCache, setMemberProgramCache };
