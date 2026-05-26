import type { AST } from "eslint";

/** One exported element discovered in the current source file. */
interface ExportedElement {
  /** Exported name as seen by importers. */
  exportedName: string;

  /** AST node used for diagnostics. */
  node: AST.Program["body"][number];
}

/** One import or re-export usage found in another file. */
interface ExportUsage {
  /** Imported export name, `default`, or `*` wildcard. */
  importedName: string;

  /** Whether the usage comes from a test file. */
  isTestFile: boolean;
}

/** Rule options for no-unused-exports. */
interface NoUnusedExportsOptions {
  /** File globs where unused exports are allowed. */
  allowInFiles?: string[];

  /** File globs treated as test files when classifying usages. */
  testFilePatterns?: string[];
}

/** Normalized state used by the rule implementation. */
interface NoUnusedExportsState {
  /** File globs where unused exports are allowed. */
  allowInFiles: string[];

  /** File globs treated as test files when classifying usages. */
  testFilePatterns: string[];
}

export type {
  ExportedElement,
  ExportUsage,
  NoUnusedExportsOptions,
  NoUnusedExportsState,
};
