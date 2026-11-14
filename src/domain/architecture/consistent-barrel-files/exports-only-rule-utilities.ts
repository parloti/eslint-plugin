import type {
  ParserServicesWithTypeInformation,
  TSESTree,
} from "@typescript-eslint/utils";
import type { AST, Rule } from "eslint";

import { ESLintUtils } from "@typescript-eslint/utils";
import path from "node:path";
import * as ts from "typescript";

/** Describes an export source literal. */
interface ExportSourceCandidate {
  /** Literal module specifier value. */
  value?: unknown;
}

/**
 * Gets TypeScript parser services when type information is available.
 * @param context Rule execution context.
 * @returns The parser services when available.
 * @example
 * ```typescript
 * const parserServices = getTypeScriptParserServices(context);
 * ```
 */
const getTypeScriptParserServices = (
  context: Rule.RuleContext,
): ParserServicesWithTypeInformation | undefined => {
  try {
    return ESLintUtils.getParserServices(context as never);
  } catch {
    return void 0;
  }
};

/**
 * Gets compiler options from the nearest TypeScript config.
 * @param filename Barrel filename.
 * @returns Compiler options when a config can be discovered.
 * @example
 * ```typescript
 * const options = getCompilerOptionsFromConfig(filename);
 * ```
 */
const getCompilerOptionsFromConfig = (
  filename: string,
): ts.CompilerOptions | undefined => {
  const configFileName = ts.findConfigFile(
    path.dirname(filename),
    (candidate): boolean => ts.sys.fileExists(candidate),
  );

  return configFileName === void 0
    ? void 0
    : ts.getParsedCommandLineOfConfigFile(
        configFileName,
        {},
        { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (): void => void 0 },
      )?.options;
};

/**
 * Gets compiler options from parser services or the nearest TypeScript config.
 * @param filename Barrel filename.
 * @param parserServices TypeScript parser services when available.
 * @returns Compiler options when they can be discovered.
 * @example
 * ```typescript
 * const options = getCompilerOptions(filename, parserServices);
 * ```
 */
const getCompilerOptions = (
  filename: string,
  parserServices: ParserServicesWithTypeInformation | undefined,
): ts.CompilerOptions | undefined =>
  parserServices === void 0
    ? getCompilerOptionsFromConfig(filename)
    : parserServices.program.getCompilerOptions();

/**
 * Resolves an export source to its target file or folder.
 * @param source Export source node.
 * @param filename Barrel filename.
 * @param parserServices TypeScript parser services when available.
 * @param compilerOptions TypeScript compiler options when available.
 * @returns The resolved target, or undefined when it cannot be verified.
 * @example
 * ```typescript
 * const target = resolveExportTarget(source, filename, parserServices, compilerOptions);
 * ```
 */
const resolveExportTarget = (
  source: unknown,
  filename: string,
  parserServices: ParserServicesWithTypeInformation | undefined,
  compilerOptions: ts.CompilerOptions | undefined,
): string | undefined => {
  if (source === null || typeof source !== "object") {
    return void 0;
  }

  const moduleSpecifier = (source as ExportSourceCandidate).value;

  if (typeof moduleSpecifier !== "string" || moduleSpecifier.length === 0) {
    return void 0;
  }

  if (compilerOptions !== void 0) {
    let resolutionMode: ts.ResolutionMode = void 0;

    if (parserServices !== void 0) {
      const { esTreeNodeToTSNodeMap, program } = parserServices;

      if (esTreeNodeToTSNodeMap.has(source)) {
        const typeScriptSource = esTreeNodeToTSNodeMap.get(
          source as TSESTree.Node,
        );

        if (ts.isStringLiteralLike(typeScriptSource)) {
          resolutionMode = program.getModeForUsageLocation(
            typeScriptSource.getSourceFile(),
            typeScriptSource,
          );
        }
      }
    }

    const resolvedModule = ts.resolveModuleName(
      moduleSpecifier,
      filename,
      compilerOptions,
      ts.sys,
      void 0,
      void 0,
      resolutionMode,
    ).resolvedModule;

    if (resolvedModule !== void 0) {
      return path.resolve(resolvedModule.resolvedFileName);
    }
  }

  return moduleSpecifier.startsWith(".")
    ? path.resolve(path.dirname(filename), moduleSpecifier)
    : void 0;
};

/**
 * Determines whether a target is in the barrel's folder or one of its descendants.
 * @param filename Barrel filename.
 * @param target Resolved export target.
 * @returns True when the target stays within the barrel folder.
 * @example
 * ```typescript
 * const local = isSameOrDescendantTarget(filename, target);
 * ```
 */
const isSameOrDescendantTarget = (
  filename: string,
  target: string,
): boolean => {
  const relativePath = path.relative(path.dirname(filename), target);

  return (
    relativePath.length === 0 ||
    (!path.isAbsolute(relativePath) &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`))
  );
};

/**
 * Determines whether a re-export resolves inside the barrel's folder tree.
 * @param statement Export statement to inspect.
 * @param filename Barrel filename.
 * @param parserServices TypeScript parser services when available.
 * @param compilerOptions TypeScript compiler options when available.
 * @returns True when the re-export target is the same folder or a descendant.
 * @example
 * ```typescript
 * const valid = hasLocalExportTarget(statement, filename, parserServices, compilerOptions);
 * ```
 */
const hasLocalExportTarget = (
  statement: AST.Program["body"][number],
  filename: string,
  parserServices: ParserServicesWithTypeInformation | undefined,
  compilerOptions: ts.CompilerOptions | undefined,
): boolean => {
  if (
    statement.type !== "ExportAllDeclaration" &&
    statement.type !== "ExportNamedDeclaration"
  ) {
    return true;
  }

  const source = statement.source ?? void 0;

  if (source === void 0) {
    return true;
  }

  const target = resolveExportTarget(
    source,
    filename,
    parserServices,
    compilerOptions,
  );

  return target !== void 0 && isSameOrDescendantTarget(filename, target);
};

export {
  getCompilerOptions,
  getTypeScriptParserServices,
  hasLocalExportTarget,
};
