import type * as ts from "typescript";

interface ProgramCacheEntry {
  cacheKey: string;
  value: unknown;
}

const MAX_CACHED_PROGRAMS = 1;
const programCaches = new Map<ts.Program, Map<string, ProgramCacheEntry>>();

const getProgramCaches = (
  program: ts.Program,
): Map<string, ProgramCacheEntry> | undefined => {
  const caches = programCaches.get(program);

  if (caches !== void 0) {
    programCaches.delete(program);
    programCaches.set(program, caches);
  }

  return caches;
};

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
  const entry = getProgramCaches(program)?.get(cacheName);

  return entry?.cacheKey === cacheKey ? entry.value : void 0;
};

/**
 * Stores one analysis value and evicts the previous program's plugin caches.
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
  let caches = getProgramCaches(program);

  if (caches === void 0) {
    caches = new Map();
    programCaches.set(program, caches);
  }

  caches.set(cacheName, { cacheKey, value });

  while (programCaches.size > MAX_CACHED_PROGRAMS) {
    const oldestProgram = programCaches.keys().next().value;

    if (oldestProgram === void 0) {
      break;
    }

    programCaches.delete(oldestProgram);
  }
};

export { getMemberProgramCache, setMemberProgramCache };
