/**
 * Creates an import statement string from import parts.
 * @param moduleSpecifier Module path used in the generated statement.
 * @param defaultImportName Existing default-import local identifier, when present.
 * @param names Named imports to include in braces.
 * @returns Fully formatted import statement text.
 * @example
 * ```typescript
 * const text = buildImportStatement("./x", void 0, ["a"]);
 * void text;
 * ```
 */
function buildImportStatement(
  moduleSpecifier: string,
  defaultImportName: string | undefined,
  names: readonly string[],
): string {
  const moduleText = JSON.stringify(moduleSpecifier);
  const namedText = `{ ${names.join(", ")} }`;

  return defaultImportName === void 0
    ? `import ${namedText} from ${moduleText};`
    : `import ${defaultImportName}, ${namedText} from ${moduleText};`;
}

export { buildImportStatement };
