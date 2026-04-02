import { describe, expect, it } from "vitest";

import { buildCombinedImportFixes } from "./fix-imports";

describe("prefer-vi-mocked-import fix-imports", () => {
  it("exports the combined import fix helper", () => {
    expect(buildCombinedImportFixes).toBeTypeOf("function");
  });

  it("returns no fixes when no matches are provided", () => {
    const fixes = buildCombinedImportFixes([], {
      insertTextAfterRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "after",
      }),
      insertTextBeforeRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "before",
      }),
      replaceTextRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "replace",
      }),
    } as never);

    expect(fixes).toStrictEqual([]);
  });

  it("merges deferred insert and update plans across matches", () => {
    const fixes = buildCombinedImportFixes(
      [
        {
          importPlan: {
            moduleSpecifier: "./alpha",
            names: ["beta"],
          },
          moduleSpecifier: "./alpha",
          newline: "\n",
        },
        {
          importPlan: {
            insert: { afterRange: [10, 20] },
            moduleSpecifier: "./alpha",
            names: ["alpha"],
          },
          moduleSpecifier: "./alpha",
          newline: "\n",
        },
        {
          importPlan: {
            moduleSpecifier: "./delta",
            names: ["zeta"],
          },
          moduleSpecifier: "./delta",
          newline: "\n",
        },
        {
          importPlan: {
            moduleSpecifier: "./delta",
            names: ["eta"],
            update: {
              existingNamedImports: ["theta"],
              range: [30, 40],
            },
          },
          moduleSpecifier: "./delta",
          newline: "\n",
        },
      ] as never,
      {
        insertTextAfterRange: (range: [number, number], text: string) => ({
          range,
          text,
          type: "after",
        }),
        insertTextBeforeRange: (range: [number, number], text: string) => ({
          range,
          text,
          type: "before",
        }),
        replaceTextRange: (range: [number, number], text: string) => ({
          range,
          text,
          type: "replace",
        }),
      } as never,
    );

    expect(fixes).toStrictEqual([
      {
        range: [30, 40],
        text: 'import { eta, theta, zeta } from "./delta";',
        type: "replace",
      },
      {
        range: [10, 20],
        text: '\nimport { alpha, beta } from "./alpha";',
        type: "after",
      },
    ]);
  });
});
