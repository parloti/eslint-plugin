# 🧪 Test Plan: AAA and Barrel Rule Regressions

**🐞 Bug:** BUG-001 - AAA and Barrel Rule Regressions
**🏛️ Epic:** EPIC-TBD - Not yet assigned
**🚀 Feature:** FEAT-TBD - Not yet assigned
**🧾 User Story:** US-TBD - Not yet assigned
**🕒 Created At:** 2026-03-29T00:00:00Z
**📌 Status:** Ready for implementation

---

## 🎯 Test Objective

Validate that the affected AAA rules reject invalid section usage and invalid assertion evaluation patterns, and that `codeperfect/consistent-barrel-files` defaults to checking only files inside `src` directories.

For bug-fix validation:
- Reproduction path: lint AAA-annotated tests and barrel-file fixtures matching the examples in BUG-001.
- Expected behavior after the fix: empty commented `Arrange` sections are reported, evaluated expressions inside `expect(...)` are reported without autofix, valid `Act` then `Assert` patterns remain valid, and default barrel-file checking is limited to `**/src/**` unless explicitly configured otherwise.

This repository has no browser UI, no DOM workflow, and no Playwright setup. Playwright is therefore not the correct executable layer for this bug. The correct executable layer is the existing Vitest plus ESLint rule-tester style coverage in `src/**/.spec.ts` and `tests/e2e/*.spec.ts`.

---

## 📋 Test Scenarios

### 🟢 Happy Path

- Scenario 1: A test with code in `Arrange`, a computed value in `Act`, and `expect(identifier)` in `Assert` passes with no AAA diagnostic.
- Scenario 2: A test with comments plus real setup code inside `Arrange` passes with no empty-section diagnostic.
- Scenario 3: `codeperfect/consistent-barrel-files` reports `missingBarrel` for `src/**/feature.ts` when no allowed barrel exists.
- Scenario 4: `codeperfect/consistent-barrel-files` honors an explicit configuration that includes non-`src` paths and still reports or accepts files according to that override.

### 🐞 Reproduction / Regression

- Reproduction before fix: A test containing `// Arrange` followed only by comments or blank lines passes without a diagnostic.
- Regression check after fix: The same snippet is reported as invalid, and any autofix only removes the empty section or safely merges it with `Act`.
- Reproduction before fix: `expect(getRuleKeys(core)).toStrictEqual(...)` inside `Act & Assert` passes without a diagnostic.
- Regression check after fix: The evaluated expression inside `expect(...)` is reported, and no autofix is offered.
- Reproduction before fix: A non-`src` file such as `tests/e2e/feature.ts` is checked by default by `codeperfect/consistent-barrel-files`.
- Regression check after fix: The same non-`src` file is ignored by default, while `packages/app/src/feature.ts` is still checked.

### 🟡 Edge Cases

- Scenario 5: `Arrange` containing only whitespace is treated the same as comment-only `Arrange` and is reported.
- Scenario 6: `Arrange` containing one setup statement and one explanatory comment remains valid.
- Scenario 7: `expect(actualResult).toBe(...)` remains valid when `actualResult` was assigned in `Act`.
- Scenario 8: A combined `Act & Assert` section that directly evaluates inside `expect(...)` is reported if the rule set continues to allow combined markers.
- Scenario 9: `codeperfect/consistent-barrel-files` still checks nested source paths such as `packages/plugin/src/rules/feature.ts` by default.
- Scenario 10: An explicit rule option targeting `tests/**/*.ts` overrides the default `**/src/**` applicability.

### 🔴 Failure Cases

- Scenario 11: Empty commented `Arrange` is reported exactly once by the canonical AAA owner after Task 1 resolves ownership.
- Scenario 12: The evaluated-expression AAA violation is reported with no autofix.
- Scenario 13: A valid `Act` then `Assert` example emits no AAA diagnostics, preventing regression from over-reporting.
- Scenario 14: Default barrel-file enforcement emits no diagnostic for non-`src` fixtures unless explicitly configured.
- Scenario 15: Default barrel-file enforcement still emits the expected barrel diagnostic for `src` fixtures.

---

## 🗂️ Test Inventory

```text
src/testing/require-aaa-sections/rule.spec.ts
  require-aaa-sections
    candidate owner for empty Arrange diagnostics
    rejects comment-only Arrange when ownership resolves here
    rejects whitespace-only Arrange when ownership resolves here
    fixes empty Arrange only when safe

src/testing/enforce-aaa-phase-purity/rule.spec.ts
  enforce-aaa-phase-purity
    rejects evaluated expressions inside expect(...)
    keeps Act-computed identifier assertions valid
    does not autofix evaluated-expression violations

tests/e2e/require-aaa-sections.spec.ts
  AAA end-to-end
    reports empty Arrange regression case if ownership resolves here
    preserves valid Act then Assert case

tests/e2e/aaa-regressions.spec.ts
  combined AAA end-to-end
    rejects comment-only Arrange sections
    rejects whitespace-only Arrange sections
    rejects expect(callExpression) without autofix
    accepts expect(identifier) after Act assignment

tests/e2e/enforce-aaa-phase-purity.spec.ts
  AAA end-to-end
    reports expect(callExpression) regression case
    accepts expect(identifier) after Act assignment

src/architecture/consistent-barrel-files/barrel-file-utilities.spec.ts
  barrel utilities
    classifies default src applicability inputs correctly

tests/e2e/consistent-barrel-files.spec.ts
  consistent-barrel-files
    ignores non-src fixtures by default
    reports missing barrel inside src by default
    leaves explicit path-override behavior pending a defined scope contract
```

## 🧭 Selector Contract

- Primary selectors: Not applicable.
- Fallback selectors: Not applicable.
- Testability notes: This bug is validated through ESLint rule execution and fixture-based file-path behavior, not through browser selectors.

## 🎭 Executable Tests

- Playwright applicability: not applicable for this repository and bug.
- Executable regression coverage should be added through the existing Vitest and rule-runner harness.

Suggested executable test for the evaluated-expression AAA regression:

```typescript
it("reports evaluated expressions inside expect", () => {
  // Arrange
  const testCase = {
    code: [
      'it("keeps evaluation out of assert", () => {',
      "  // Arrange",
      "  const input = core;",
      "",
      "  // Act & Assert",
      "  expect(getRuleKeys(input)).toStrictEqual([",
      '    "codeperfect/no-multiple-declarators",',
      '    "codeperfect/prefer-interface-types",',
      "  ]);",
      "});",
    ].join("\n"),
    errors: [
      {
        messageId: "assertionEvaluatesExpression",
      },
    ],
    filename: "example.spec.ts",
  };

  // Act
  const result = runRuleCase(
    "enforce-aaa-phase-purity",
    enforceAaaPhasePurityRule,
    testCase,
  );

  // Assert
  expect(result.messageIds).toStrictEqual(
    testCase.errors.map((error) => error.messageId),
  );
  expect(result.output).toBeUndefined();
});
```

Suggested executable test for the valid `Act` then `Assert` AAA case:

```typescript
it("accepts Act-computed identifiers in Assert", () => {
  // Arrange
  const testCase = {
    code: [
      'it("asserts on a precomputed value", () => {',
      "  // Arrange",
      "  const input = core;",
      "",
      "  // Act",
      "  const ruleKeys = getRuleKeys(input);",
      "",
      "  // Assert",
      "  expect(ruleKeys).toStrictEqual([",
      '    "codeperfect/no-multiple-declarators",',
      '    "codeperfect/prefer-interface-types",',
      "  ]);",
      "});",
    ].join("\n"),
    filename: "example.spec.ts",
  };

  // Act
  const result = runRuleCase(
    "enforce-aaa-phase-purity",
    enforceAaaPhasePurityRule,
    testCase,
  );

  // Assert
  expect(result.messageIds).toStrictEqual([]);
});
```

Suggested executable test for the default barrel-file scope regression:

```typescript
it("ignores non-src files by default and still checks src files", () => {
  // Arrange
  const ignoredFixture = createFixtureSet({
    "feature.ts": "export const feature = 1;",
  });
  const checkedFixture = createFixtureSet({
    "src/feature.ts": "export const feature = 1;",
  });

  const ignoredCase = {
    code: "export const feature = 1;",
    filename: ignoredFixture.getFilePath("feature.ts"),
  };
  const checkedCase = {
    code: "export const feature = 1;",
    errors: [{ messageId: "missingBarrel" }],
    filename: checkedFixture.getFilePath("src/feature.ts"),
  };

  // Act
  const ignoredResult = runRuleCase(
    "consistent-barrel-files",
    consistentBarrelFilesRule,
    ignoredCase,
  );
  const checkedResult = runRuleCase(
    "consistent-barrel-files",
    consistentBarrelFilesRule,
    checkedCase,
  );

  // Assert
  expect(ignoredResult.messageIds).toStrictEqual([]);
  expect(checkedResult.messageIds).toStrictEqual(["missingBarrel"]);
});
```

## 🧪 Coverage Notes

- Missing cases: explicit non-`src` scope override behavior is still blocked by the absence of a rule-level path-scoping contract.
- Risk areas: duplicate AAA diagnostics, unstable autofix ownership for empty sections, and implicit assumptions in current barrel-file tests about non-`src` applicability.
- Assumptions: the eventual evaluated-expression diagnostic message id may differ from the placeholder used in this plan and should be aligned with the owning rule's final message contract.

## 🔁 Handoff

- Next: 💻️ Implementation Agent / human
- Status: ready-for-handoff