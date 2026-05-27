import type { AST } from "eslint";

/** One exported element discovered in the current source file. */
export interface ExportedElement {
  /** Exported name as seen by importers. */
  exportedName: string;

  /** Whether the exported entity is type-only or value-capable. */
  exportKind: ExportKind;

  /** AST node used for diagnostics. */
  node: AST.Program["body"][number];
}

/** Export category used when classifying concrete usages. */
export type ExportKind = "type" | "value";

/** One concrete usage found in another file. */
export interface ExportUsage {
  /** Whether the usage comes from a test file. */
  isTestFile: boolean;
}

/** Rule options for no-unused-exports. */
export interface NoUnusedExportsOptions {
  /** File globs that define public API export surfaces. */
  publicApiFiles?: string[];

  /** File globs treated as test files when classifying usages. */
  testFilePatterns?: string[];
}

/** Normalized state used by the rule implementation. */
export interface NoUnusedExportsState {
  /** File globs that define public API export surfaces. */
  publicApiFiles: string[];

  /** File globs treated as test files when classifying usages. */
  testFilePatterns: string[];
}
