import type { AST, Rule } from "eslint";
import type * as ts from "typescript";

import type {
  ExportedElement,
  ExportUsage,
  NoUnusedExportsState,
} from "./types";

import { collectExportedElements as collectExportedElementsFromDeclarations } from "./no-unused-exports-declaration-utilities";
import { getTypeScriptProgram as getTypeScriptProgramFromServices } from "./no-unused-exports-identifier-utilities";
import {
  classifyExportUsage as classifyExportUsageFromUsages,
  collectCrossFileUsages as collectCrossFileUsagesFromUsages,
} from "./no-unused-exports-usage-utilities";

/**
 * Classifies one exported name based on cross-file usages.
 * @param usages Collected usages.
 * @returns Classification label.
 * @example
 * ```typescript
 * const classification = classifyExportUsage(usages);
 * ```
 */
const classifyExportUsage = (
  usages: ExportUsage[],
): "production" | "test-only" | "unused" =>
  classifyExportUsageFromUsages(usages);

/**
 * Collects concrete usages of one exported element across the program.
 * @param program TypeScript program.
 * @param sourceFilename Source filename where export is defined.
 * @param state Normalized rule options.
 * @param repoRoot Absolute repository root used for test-file classification.
 * @param exportedElement Exported element to classify.
 * @returns Concrete usages for the exported element.
 * @example
 * ```typescript
 * const usages = collectCrossFileUsages(program, "/repo/src/feature.ts", state, "/repo", exportedElement);
 * ```
 */
const collectCrossFileUsages = (
  program: ts.Program,
  sourceFilename: string,
  state: NoUnusedExportsState,
  repoRoot: string,
  exportedElement: ExportedElement,
): ExportUsage[] =>
  collectCrossFileUsagesFromUsages(
    program,
    sourceFilename,
    state,
    repoRoot,
    exportedElement,
  );

/**
 * Collects exported elements from one program body.
 * @param body Program body statements.
 * @returns Exported elements in declaration order.
 * @example
 * ```typescript
 * const exported = collectExportedElements(program.body);
 * ```
 */
const collectExportedElements = (
  body: AST.Program["body"],
): ExportedElement[] => collectExportedElementsFromDeclarations(body);

/**
 * Resolves TypeScript parser services program when available.
 * @param context Rule context.
 * @returns TypeScript program when available.
 * @example
 * ```typescript
 * const program = getTypeScriptProgram(context);
 * ```
 */
const getTypeScriptProgram = (
  context: Rule.RuleContext,
): ts.Program | undefined => getTypeScriptProgramFromServices(context);

export {
  classifyExportUsage,
  collectCrossFileUsages,
  collectExportedElements,
  getTypeScriptProgram,
};
