import type { AST, Rule } from "eslint";

import { minimatch } from "minimatch";
import path from "node:path";

import type { BarrelFilesExportsOnlyOptions } from "./types";

import { createRuleDocumentation } from "../../custom-rule-documentation";

/** Default value used by this module. */
const DEFAULT_BARREL_NAMES = ["index.ts", "index.tsx", "index.js", "index.jsx"];

/** Default folder globs for barrel exports-only checks. */
const DEFAULT_FOLDER_GLOBS = ["src/*/**"];

/** Type definition for rule data. */
interface BarrelFilesExportsOnlyState {
  /** Folders field value. */
  folders: string[];

  /** Names field value. */
  names: string[];

  /** NamesSet field value. */
  namesSet: Set<string>;
}

/**
 * Normalizes a string list option into a clean list.
 * @param value Raw option value.
 * @param defaults Default list when the option is empty.
 * @returns Normalized string list.
 * @example
 * ```typescript
 * const names = normalizeList("index.ts", ["index.ts"]);
 * ```
 */
const normalizeList = (value: unknown, defaults: string[]): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? [] : [trimmed];
  }

  return [...defaults];
};

/**
 * Builds the rule options state from raw options.
 * @param options Raw rule options.
 * @returns Normalized rule options.
 * @example
 * ```typescript
 * const state = getOptions([{}]);
 * ```
 */
const getOptions = (
  options: readonly unknown[],
): BarrelFilesExportsOnlyState => {
  const rawOptions = options[0] as BarrelFilesExportsOnlyOptions | undefined;
  const folders = normalizeList(rawOptions?.folders, DEFAULT_FOLDER_GLOBS);
  const names = normalizeList(rawOptions?.names, DEFAULT_BARREL_NAMES);

  return { folders, names, namesSet: new Set(names) };
};

/**
 * Checks whether the filename is valid for linting.
 * @param filename Absolute filename.
 * @returns True when the filename is lintable.
 * @example
 * ```typescript
 * const ok = isLintableFilename("/repo/src/index.ts");
 * ```
 */
const isLintableFilename = (filename: string): boolean =>
  filename.length > 0 && path.isAbsolute(filename);

/**
 * Normalizes a filename to a repo-relative path.
 * @param filename Absolute filename.
 * @returns Relative path using forward slashes.
 * @example
 * ```typescript
 * const relative = normalizeRelativePath("/repo/src/index.ts");
 * ```
 */
const normalizeRelativePath = (filename: string): string =>
  path.relative(process.cwd(), filename).split(path.sep).join("/");

/**
 * Checks whether a file path matches any configured folder globs.
 * @param filename Absolute filename.
 * @param folders Folder glob patterns.
 * @returns True when the filename is within configured folders.
 * @example
 * ```typescript
 * const ok = isPathInFolders("/repo/src/index.ts", ["src/**"]);
 * ```
 */
const isPathInFolders = (filename: string, folders: string[]): boolean => {
  const relativePath = normalizeRelativePath(filename);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return false;
  }

  return folders.some((folder) =>
    minimatch(relativePath, folder, { dot: true }),
  );
};

/**
 * Determines whether a file should be linted by this rule.
 * @param filename Absolute filename.
 * @param options Normalized rule options.
 * @returns True when the file should be checked.
 * @example
 * ```typescript
 * const ok = shouldLintFile("/repo/src/index.ts", state);
 * ```
 */
const shouldLintFile = (
  filename: string,
  options: ReturnType<typeof getOptions>,
): boolean => {
  if (!isLintableFilename(filename)) {
    return false;
  }

  if (options.folders.length === 0 || options.names.length === 0) {
    return false;
  }

  return isPathInFolders(filename, options.folders);
};

/**
 * Determines whether a file is a barrel file under the rule options.
 * @param filename Absolute filename.
 * @param options Normalized rule options.
 * @returns True when the file is a barrel file.
 * @example
 * ```typescript
 * const ok = isBarrelFile("/repo/src/index.ts", state);
 * ```
 */
const isBarrelFile = (
  filename: string,
  options: ReturnType<typeof getOptions>,
): boolean => {
  if (!shouldLintFile(filename, options)) {
    return false;
  }

  return options.namesSet.has(path.basename(filename));
};

/**
 * Checks whether a statement is allowed in a barrel file.
 * @param statement Program statement node.
 * @returns True when the statement is permitted.
 * @example
 * ```typescript
 * const ok = isAllowedBarrelStatement(statement);
 * ```
 */
const isAllowedBarrelStatement = (
  statement: AST.Program["body"][number],
): boolean => {
  if (statement.type === "ExportAllDeclaration") {
    return true;
  }

  if (statement.type !== "ExportNamedDeclaration") {
    return false;
  }

  const declaration = statement.declaration ?? void 0;

  if (declaration !== void 0) {
    return false;
  }

  const source = statement.source ?? void 0;

  return source !== void 0;
};

/**
 * Builds a rule listener for the supplied file.
 * @param context Rule execution context.
 * @param filename Absolute filename to lint.
 * @param options Normalized rule options.
 * @returns The rule listener for the file.
 * @example
 * ```typescript
 * const listener = buildListenerForFile(context, filename, state);
 * ```
 */
const buildListenerForFile = (
  context: Rule.RuleContext,
  filename: string,
  options: ReturnType<typeof getOptions>,
): Rule.RuleListener => {
  if (!isBarrelFile(filename, options)) {
    return {};
  }

  return {
    Program(node: AST.Program): void {
      for (const statement of node.body) {
        if (!isAllowedBarrelStatement(statement)) {
          context.report({
            messageId: "invalidBarrelContent",
            node: statement,
          });
          break;
        }
      }
    },
  };
};

/**
 * ESLint rule enforcing re-export-only barrel files.
 * @example
 * ```typescript
 * const rule = barrelFilesExportsOnlyRule;
 * ```
 */
const barrelFilesExportsOnlyRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return buildListenerForFile(
      context,
      context.filename,
      getOptions(context.options),
    );
  },
  meta: {
    docs: createRuleDocumentation(
      "barrel-files-exports-only",
      "Require barrel files to only contain re-export statements.",
    ),
    messages: {
      invalidBarrelContent:
        "Barrel files must only re-export from other modules and contain no imports or declarations.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          folders: {
            oneOf: [
              { type: "string" },
              {
                items: { type: "string" },
                minItems: 1,
                type: "array",
              },
            ],
          },
          names: {
            oneOf: [
              { type: "string" },
              {
                items: { type: "string" },
                minItems: 1,
                type: "array",
              },
            ],
          },
        },
        type: "object",
      },
    ],
    type: "problem",
  },
};

export { barrelFilesExportsOnlyRule };
