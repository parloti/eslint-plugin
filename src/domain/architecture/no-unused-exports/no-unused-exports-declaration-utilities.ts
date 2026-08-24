import type { AST } from "eslint";
import type * as ESTree from "estree";

import type { ExportedElement, ExportKind } from "./types";

import {
  collectPatternIdentifierNames,
  getExportSpecifierLocalName,
  getExportSpecifierName,
} from "./no-unused-exports-pattern-utilities";
import {
  asRecord,
  readArrayProperty,
  readStringProperty,
} from "./no-unused-exports-record-utilities";

/** Declaration statement types that own one named `id` property. */
const NAMED_DECLARATION_TYPES = new Set([
  "ClassDeclaration",
  "FunctionDeclaration",
  "TSEnumDeclaration",
  "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration",
]);

/** Local top-level declaration discovered when collecting export sources. */
interface LocalDeclaration {
  /** Export kind implied by the declaration. */
  kind: ExportKind;

  /** Declaration statement used for diagnostics. */
  node: AST.Program["body"][number];
}

/**
 * Records variable declarator names as value declarations.
 * @param declarationNames Map from declared name to declaration metadata.
 * @param declarations Variable declarator candidates.
 * @param statement Owning statement used for diagnostics.
 * @example
 * ```typescript
 * addVariableDeclaratorNames(declarationNames, declarations, statement);
 * ```
 */
const addVariableDeclaratorNames = (
  declarationNames: Map<string, LocalDeclaration>,
  declarations: readonly unknown[],
  statement: AST.Program["body"][number],
): void => {
  for (const declaration of declarations) {
    const declarationRecord = asRecord(declaration);

    if (declarationRecord === void 0) {
      continue;
    }

    const patternNames = collectPatternIdentifierNames(declarationRecord["id"]);

    for (const name of patternNames) {
      declarationNames.set(name, { kind: "value", node: statement });
    }
  }
};

/**
 * Collects top-level declaration names owned by the current module.
 * @param body Program body statements.
 * @returns Map from locally declared name to its declaration metadata.
 * @example
 * ```typescript
 * const declarations = collectLocalDeclarationNames(program.body);
 * ```
 */
const collectLocalDeclarationNames = (
  body: AST.Program["body"],
): Map<string, LocalDeclaration> => {
  const declarationNames = new Map<string, LocalDeclaration>();

  for (const statement of body) {
    const declarationCandidate =
      statement.type === "ExportNamedDeclaration" &&
      statement.declaration !== null &&
      statement.declaration !== void 0
        ? statement.declaration
        : statement;
    const declarationCandidateRecord = asRecord(declarationCandidate);
    const declarationCandidateType = readStringProperty(
      declarationCandidate,
      "type",
    );

    if (
      declarationCandidateRecord === void 0 ||
      declarationCandidateType === void 0
    ) {
      continue;
    }

    if (NAMED_DECLARATION_TYPES.has(declarationCandidateType)) {
      const declarationName = readStringProperty(
        declarationCandidateRecord["id"],
        "name",
      );

      if (declarationName !== void 0) {
        declarationNames.set(declarationName, {
          kind:
            declarationCandidateType === "TSInterfaceDeclaration" ||
            declarationCandidateType === "TSTypeAliasDeclaration"
              ? "type"
              : "value",
          node: statement,
        });
      }

      continue;
    }

    if (declarationCandidateType !== "VariableDeclaration") {
      continue;
    }

    const declarations = readArrayProperty(
      declarationCandidateRecord,
      "declarations",
    );

    if (declarations === void 0) {
      continue;
    }

    addVariableDeclaratorNames(declarationNames, declarations, statement);
  }

  return declarationNames;
};

/**
 * Adds exported elements described by one export declaration site.
 * @param exportedElements Mutable exported-element accumulator.
 * @param statement Named export statement being inspected.
 * @example
 * ```typescript
 * addDeclarationExportElements(exportedElements, statement);
 * ```
 */
const addDeclarationExportElements = (
  exportedElements: ExportedElement[],
  statement: ESTree.ExportNamedDeclaration,
): void => {
  const declaration = asRecord(statement.declaration);

  if (readStringProperty(declaration, "type") === "VariableDeclaration") {
    const variableDeclarations = readArrayProperty(declaration, "declarations");

    if (variableDeclarations !== void 0) {
      for (const variable of variableDeclarations) {
        const patternNames = collectPatternIdentifierNames(
          asRecord(variable)?.["id"],
        );

        for (const name of patternNames) {
          exportedElements.push({
            exportedName: name,
            exportKind: "value",
            node: statement,
          });
        }
      }
    }

    return;
  }

  const declarationName = readStringProperty(declaration?.["id"], "name");
  const declarationType = readStringProperty(declaration, "type");
  const exportKind: ExportKind =
    declarationType === "TSInterfaceDeclaration" ||
    declarationType === "TSTypeAliasDeclaration"
      ? "type"
      : "value";

  if (typeof declarationName === "string") {
    exportedElements.push({
      exportedName: declarationName,
      exportKind,
      node: statement,
    });
  }
};

/**
 * Adds exported elements for the specifiers of one named export statement.
 * @param exportedElements Mutable exported-element accumulator.
 * @param localDeclarationNames Locally declared names for specifier lookup.
 * @param statement Named export statement being inspected.
 * @example
 * ```typescript
 * addSpecifierExportElements(exportedElements, localDeclarationNames, statement);
 * ```
 */
const addSpecifierExportElements = (
  exportedElements: ExportedElement[],
  localDeclarationNames: ReadonlyMap<string, LocalDeclaration>,
  statement: ESTree.ExportNamedDeclaration,
): void => {
  for (const specifier of statement.specifiers) {
    const localName = getExportSpecifierLocalName(specifier);
    const localDeclaration =
      localName === void 0 ? void 0 : localDeclarationNames.get(localName);

    if (localDeclaration === void 0) {
      continue;
    }

    const exportedName = getExportSpecifierName(specifier);

    if (exportedName !== void 0) {
      const statementExportKind = readStringProperty(statement, "exportKind");
      const specifierExportKind = readStringProperty(specifier, "exportKind");
      const isTypeOnlyExport =
        statementExportKind === "type" || specifierExportKind === "type";

      exportedElements.push({
        exportedName,
        exportKind: isTypeOnlyExport ? "type" : localDeclaration.kind,
        node: localDeclaration.node,
      });
    }
  }
};

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
): ExportedElement[] => {
  const exportedElements: ExportedElement[] = [];
  const localDeclarationNames = collectLocalDeclarationNames(body);

  for (const statement of body) {
    if (statement.type === "ExportDefaultDeclaration") {
      exportedElements.push({
        exportedName: "default",
        exportKind: "value",
        node: statement,
      });
      continue;
    }

    if (statement.type !== "ExportNamedDeclaration") {
      continue;
    }

    if (statement.source !== null && statement.source !== void 0) {
      continue;
    }

    if (statement.declaration !== null && statement.declaration !== void 0) {
      addDeclarationExportElements(exportedElements, statement);

      continue;
    }

    addSpecifierExportElements(
      exportedElements,
      localDeclarationNames,
      statement,
    );
  }

  return exportedElements;
};

export { collectExportedElements };
