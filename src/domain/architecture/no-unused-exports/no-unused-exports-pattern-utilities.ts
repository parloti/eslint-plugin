import {
  asRecord,
  readArrayProperty,
  readStringProperty,
} from "./no-unused-exports-record-utilities";

/**
 * Collects identifier names from one variable pattern.
 * @param node Variable pattern candidate.
 * @returns Identifier names declared by the pattern.
 * @example
 * ```typescript
 * const names = collectPatternIdentifierNames(pattern);
 * ```
 */
const collectPatternIdentifierNames = (node: unknown): string[] => {
  const pattern = asRecord(node);

  if (pattern === void 0) {
    return [];
  }

  const patternType = readStringProperty(pattern, "type");

  if (patternType === "Identifier") {
    const name = readStringProperty(pattern, "name");
    return name === void 0 ? [] : [name];
  }

  if (patternType === "RestElement") {
    return collectPatternIdentifierNames(pattern["argument"]);
  }

  if (patternType === "AssignmentPattern") {
    return collectPatternIdentifierNames(pattern["left"]);
  }

  if (patternType === "ArrayPattern") {
    const elements = readArrayProperty(pattern, "elements");

    return elements === void 0
      ? []
      : elements.flatMap((element) => collectPatternIdentifierNames(element));
  }

  if (patternType === "ObjectPattern") {
    const properties = readArrayProperty(pattern, "properties");

    return properties === void 0
      ? []
      : properties.flatMap((property) => {
          if (readStringProperty(property, "type") === "RestElement") {
            return collectPatternIdentifierNames(
              asRecord(property)?.["argument"],
            );
          }

          return collectPatternIdentifierNames(asRecord(property)?.["value"]);
        });
  }

  return [];
};

/**
 * Reads one export specifier name.
 * @param specifier Export specifier candidate.
 * @returns Exported name when available.
 * @example
 * ```typescript
 * const name = getExportSpecifierName(specifier);
 * ```
 */
const getExportSpecifierName = (specifier: unknown): string | undefined => {
  const candidate = asRecord(specifier);
  const exportedName = readStringProperty(candidate?.["exported"], "name");

  if (typeof exportedName === "string") {
    return exportedName;
  }

  const localName = readStringProperty(candidate?.["local"], "name");

  return typeof localName === "string" ? localName : void 0;
};

/**
 * Reads one local export specifier name.
 * @param specifier Export specifier candidate.
 * @returns Local specifier name when available.
 * @example
 * ```typescript
 * const name = getExportSpecifierLocalName(specifier);
 * ```
 */
const getExportSpecifierLocalName = (
  specifier: unknown,
): string | undefined => {
  const candidate = asRecord(specifier);

  return readStringProperty(candidate?.["local"], "name");
};

export {
  collectPatternIdentifierNames,
  getExportSpecifierLocalName,
  getExportSpecifierName,
};
