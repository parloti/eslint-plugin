import type * as ts from "typescript";

import {
  getGlobalSourceFiles,
  getSourceDependencies,
  getSourceFileFacts,
} from "../program-analysis";
import { isSupportedMember } from "./member-host-utilities";

/**
 * Selects eager reference consumers by declared names and observed import edges.
 * @param program Active semantic snapshot.
 * @param sourceFiles Eligible production files inside one owner.
 * @returns Member names and a cycle-safe consumer query; disconnected reads still need fallback checks.
 * @example
 * ```typescript
 * const index = buildMemberConsumerIndex(program, scope.sourceFiles);
 * const consumers = index.getConsumers("value");
 * ```
 */
const buildMemberConsumerIndex = (
  program: ts.Program,
  sourceFiles: Iterable<ts.SourceFile>,
) => {
  // Binding populates parent links on compiler-host source files.
  program.getTypeChecker();
  const files = new Set(sourceFiles);
  const declarations = new Map<string, Set<ts.SourceFile>>();
  const importers = new Map<ts.SourceFile, ts.SourceFile[]>();
  for (const file of files) {
    for (const reference of getSourceFileFacts(file).references) {
      if (!(
        isSupportedMember(reference.parent) &&
        "name" in reference.parent &&
        reference.parent.name === reference
      )) {
        continue;
      }

      const owners = declarations.get(reference.text) ?? new Set();
      owners.add(file);
      declarations.set(reference.text, owners);
    }
    for (const dependency of getSourceDependencies(file, program)) {
      if (!files.has(dependency)) {
        continue;
      }
      const consumers = importers.get(dependency) ?? [];
      consumers.push(file);
      importers.set(dependency, consumers);
    }
  }
  const globals = getGlobalSourceFiles(program).filter((file) =>
    files.has(file),
  );
  return {
    getConsumers: (name: string): ReadonlySet<ts.SourceFile> => {
      const consumers = new Set<ts.SourceFile>();
      const pending = [...(declarations.get(name) ?? []), ...globals];
      while (pending.length > 0) {
        const file = pending.pop();
        if (file === void 0 || consumers.has(file)) {
          continue;
        }
        consumers.add(file);
        const directImporters = importers.get(file) ?? [];
        for (const importer of directImporters) {
          pending.push(importer);
        }
      }
      return consumers;
    },
    memberNames: new Set(declarations.keys()),
  };
};

export { buildMemberConsumerIndex };
