import type { NamedInlineTypeMatch, NamingNode } from "./types";

/**
 * Selects literals that can be replaced without overlapping an enclosing fix.
 * @param matches Named inline object type matches.
 * @returns Outermost matches; nested signatures remain for the next lint pass.
 * @example
 * ```typescript
 * const outermostMatches = getOutermostMatches(matches);
 * ```
 */
function getOutermostMatches(
  matches: readonly NamedInlineTypeMatch[],
): readonly NamedInlineTypeMatch[] {
  const matchedNodes = new Set<unknown>(matches.map((match) => match.node));

  return matches.filter((match) => {
    let current = (match.node as NamingNode).parent;

    while (current !== null && current !== void 0) {
      if (matchedNodes.has(current)) {
        return false;
      }

      current = current.parent;
    }

    return true;
  });
}

export { getOutermostMatches };
