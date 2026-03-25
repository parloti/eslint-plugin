import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { RuleMatch } from "./types";

import { buildFix } from "./fix";

/** Type definition for rule data. */
interface StubFix {
  /** Source range used by the fix. */
  range: [number, number];

  /** Fix payload text when applicable. */
  text?: string;

  /** Fix operation identifier used by tests. */
  type: "insertAfter" | "insertBefore" | "remove" | "replace";
}

/**
 * Creates a recording fixer used by buildFix tests.
 * @returns Fixer implementation with deterministic outputs.
 * @example
 * ```typescript
 * const fixer = createFixer();
 * void fixer;
 * ```
 */
function createFixer(): Rule.RuleFixer {
  return {
    insertTextAfterRange,
    insertTextBeforeRange,
    removeRange,
    replaceTextRange,
  } as unknown as Rule.RuleFixer;
}

/**
 * Creates a basic matcher payload that can be customized per test.
 * @returns Rule match seed.
 * @example
 * ```typescript
 * const match = createMatch();
 * void match;
 * ```
 */
function createMatch(): RuleMatch {
  return {
    bindings: [
      {
        exportedName: "a",
        localName: "a",
        propertyKeyRange: [0, 1],
        propertyRange: [0, 1],
        propertyValueRange: [0, 1],
      },
    ],
    declarations: new Map([
      [
        "a",
        {
          declarationIdRange: [0, 1],
          initializerRange: [2, 8],
          localName: "a",
          statementRange: [0, 9],
        },
      ],
    ]),
    importPlan: {
      insert: {},
      moduleSpecifier: "./mod",
      names: ["a"],
    },
    memberRewrites: [
      {
        exportedName: "a",
        localObjectRange: [10, 11],
      },
    ],
    mockSpecifierIsImportExpression: false,
    mockSpecifierRange: [20, 27],
    moduleSpecifier: "./mod",
    newline: "\n",
    node: {} as never,
    sourceText: "const a = vi.fn();\n",
  };
}

/**
 * Creates an insert-after stub fix.
 * @param range Target range.
 * @param text Inserted text.
 * @returns ESLint fix.
 * @example
 * ```typescript
 * const fix = insertTextAfterRange([0, 1], "x");
 * void fix;
 * ```
 */
function insertTextAfterRange(range: [number, number], text: string): Rule.Fix {
  return { range, text, type: "insertAfter" } as unknown as Rule.Fix;
}

/**
 * Creates an insert-before stub fix.
 * @param range Target range.
 * @param text Inserted text.
 * @returns ESLint fix.
 * @example
 * ```typescript
 * const fix = insertTextBeforeRange([0, 1], "x");
 * void fix;
 * ```
 */
function insertTextBeforeRange(
  range: [number, number],
  text: string,
): Rule.Fix {
  return { range, text, type: "insertBefore" } as unknown as Rule.Fix;
}

/**
 * Returns true when a value is a stub fixer payload.
 * @param value Value to inspect.
 * @returns True when value matches `StubFix`.
 * @example
 * ```typescript
 * const ok = isStubFix({ range: [0, 1], type: "remove" });
 * void ok;
 * ```
 */
function isStubFix(value: unknown): value is StubFix {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const maybeFix = value as Partial<StubFix>;
  return (
    Array.isArray(maybeFix.range) &&
    typeof maybeFix.range[0] === "number" &&
    typeof maybeFix.range[1] === "number" &&
    typeof maybeFix.type === "string"
  );
}

/**
 * Creates a remove-range stub fix.
 * @param range Target range.
 * @returns ESLint fix.
 * @example
 * ```typescript
 * const fix = removeRange([0, 1]);
 * void fix;
 * ```
 */
function removeRange(range: [number, number]): Rule.Fix {
  return { range, type: "remove" } as unknown as Rule.Fix;
}

/**
 * Creates a replace-range stub fix.
 * @param range Target range.
 * @param text Replacement text.
 * @returns ESLint fix.
 * @example
 * ```typescript
 * const fix = replaceTextRange([0, 1], "x");
 * void fix;
 * ```
 */
function replaceTextRange(range: [number, number], text: string): Rule.Fix {
  return { range, text, type: "replace" } as unknown as Rule.Fix;
}

describe("prefer-vi-mocked-import fix", () => {
  it("exports buildFix", () => {
    // Arrange

    // Act & Assert
    expect(buildFix).toBeTypeOf("function");
  });

  it("skips binding replacement when declaration is missing", () => {
    // Arrange
    const match = createMatch();
    match.bindings = [
      {
        exportedName: "missing",
        localName: "missing",
        propertyKeyRange: [0, 1],
        propertyRange: [0, 1],
        propertyValueRange: [0, 1],
      },
    ];

    // Act
    const replaceTexts = buildFix(match, createFixer())
      .filter((fix) => isStubFix(fix))
      .filter((fix) => fix.type === "replace")
      .map((fix) => fix.text);

    // Assert
    expect(replaceTexts).not.toContain("missing: vi.fn()");
  });

  it("skips import work when no names are planned", () => {
    // Arrange
    const match = createMatch();
    match.importPlan = { moduleSpecifier: "./mod", names: [] };

    // Act
    const insertFixes = buildFix(match, createFixer())
      .filter((fix) => isStubFix(fix))
      .filter(
        (fix) => fix.type === "insertAfter" || fix.type === "insertBefore",
      );

    // Assert
    expect(insertFixes).toStrictEqual([]);
  });

  it("inserts import at the top when insert plan is omitted", () => {
    // Arrange
    const match = createMatch();
    match.importPlan = { moduleSpecifier: "./mod", names: ["a"] };

    // Act
    const beforeFix = buildFix(match, createFixer())
      .filter((fix) => isStubFix(fix))
      .find((fix) => fix.type === "insertBefore");

    // Assert
    expect(beforeFix).toBeDefined();
    expect(beforeFix).toMatchObject({
      range: [0, 0],
      text: 'import { a } from "./mod";\n\n',
      type: "insertBefore",
    });
  });

  it("keeps default import when updating existing import", () => {
    // Arrange
    const match = createMatch();
    match.importPlan = {
      moduleSpecifier: "./mod",
      names: ["a"],
      update: {
        defaultImportName: "mod",
        existingNamedImports: [],
        range: [0, 22],
      },
    };

    // Act
    const replaceTexts = buildFix(match, createFixer())
      .filter((fix) => isStubFix(fix))
      .filter((fix) => fix.type === "replace")
      .map((fix) => fix.text);

    // Assert
    expect(replaceTexts).toContain('import mod, { a } from "./mod";');
  });

  it("removes trailing declaration until source end without newline", () => {
    // Arrange
    const match = createMatch();
    match.sourceText = "const a = vi.fn();";

    // Act
    const removal = buildFix(match, createFixer())
      .filter((fix) => isStubFix(fix))
      .find((fix) => fix.type === "remove");

    // Assert
    expect(removal).toBeDefined();
    expect(removal).toMatchObject({ range: [0, 18], type: "remove" });
  });
});
