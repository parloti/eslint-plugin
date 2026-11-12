import * as ts from "typescript";

import {
  getGlobalSourceFiles,
  getSourceDependencies,
} from "../program-analysis";
import {
  getMemberProgramCache,
  setMemberProgramCache,
} from "./member-program-cache-utilities";

const MAX_CACHED_REACHABILITY_ROOTS = 16;

interface SourceReachability {
  reachable: Map<ts.SourceFile, Set<ts.SourceFile>>;
}

const canSourceReachMember = (
  sourceFile: ts.SourceFile,
  memberSymbol: ts.Symbol,
  program: ts.Program,
): boolean => {
  const declarations = memberSymbol.declarations;
  if (declarations === void 0 || declarations.length === 0) {
    return true;
  }
  let cache = getMemberProgramCache(program, "source-reachability", "") as
    SourceReachability | undefined;

  if (cache === void 0) {
    cache = { reachable: new Map() };
    setMemberProgramCache(program, "source-reachability", "", cache);
  }

  let reachable = cache.reachable.get(sourceFile);

  if (reachable === void 0) {
    reachable = new Set();
    const pending = [sourceFile, ...getGlobalSourceFiles(program)];
    while (pending.length > 0) {
      const file = pending.pop();
      if (file === void 0 || reachable.has(file)) {
        continue;
      }
      reachable.add(file);
      pending.push(...getSourceDependencies(file, program));
    }
    cache.reachable.set(sourceFile, reachable);

    while (cache.reachable.size > MAX_CACHED_REACHABILITY_ROOTS) {
      const oldestSourceFile = cache.reachable.keys().next().value;

      if (oldestSourceFile === void 0) {
        break;
      }

      cache.reachable.delete(oldestSourceFile);
    }
  } else {
    cache.reachable.delete(sourceFile);
    cache.reachable.set(sourceFile, reachable);
  }
  return declarations.some((declaration) =>
    reachable.has(declaration.getSourceFile()),
  );
};

export { canSourceReachMember };
