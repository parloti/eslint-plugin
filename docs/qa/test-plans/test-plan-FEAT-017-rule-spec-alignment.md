# 🧪 Test Plan: Rule Spec Alignment

**🏛️ Epic:** EPIC-017 - Adopt Updated Plugin Rule Specifications  
**🚀 Feature:** FEAT-017 - Align Rule Implementations To New Specs  
**🧾 User Story:** US-017 - Replace Current Rule Behavior With Updated Specifications
**🕒 Created At:** 2026-03-26T20:54:31Z
**📌 Status:** Ready for implementation

---

## 🎯 Test Objective

Validate that the plugin behavior now matches the updated rule documentation in `docs/rules/*.md`, especially where the barrel-file rules intentionally dropped retrocompatibility and changed their public option contracts.

This repository has no browser UI or Playwright setup. For executable coverage, the correct end-to-end layer is the existing `@typescript-eslint/rule-tester` suite under `tests/e2e/`. The scenarios below therefore map to repo-native e2e tests rather than browser automation.

---

## 📋 Test Scenarios

### 🟢 Happy Path

- Scenario 1: `barrel-files-exports-only` accepts empty barrel files.
- Scenario 2: `barrel-files-exports-only` accepts pure re-export barrels.
- Scenario 3: `barrel-files-exports-only` accepts exported type-only declarations in barrel files.
- Scenario 4: `consistent-barrel-files` accepts folders with a non-barrel module plus an allowed barrel.
- Scenario 5: `consistent-barrel-files` accepts custom barrel stems when configured with `allowedNames`.
- Scenario 6: `no-reexports-outside-barrels` allows re-exports inside allowed barrel stems.
- Scenario 7: `no-reexports-outside-barrels` allows locally defined exports in non-barrel files.

### 🟡 Edge Cases

- Scenario 8: `consistent-barrel-files` only reports missing barrels for folders that contain at least one non-barrel module file.
- Scenario 9: `consistent-barrel-files` does not report a forbidden barrel when the folder contains only the barrel file.
- Scenario 10: `consistent-barrel-files` falls back to the default `index` stem when `allowedNames` is empty.
- Scenario 11: `no-reexports-outside-barrels` respects custom allowed barrel stems through `allowedBarrelNames`.
- Scenario 12: repo-local lint configuration disables `consistent-barrel-files` in root config files, `scripts/**`, and `tests/**` while keeping it active for source files.

### 🔴 Failure Cases

- Scenario 13: `barrel-files-exports-only` rejects imports, runtime exports, and executable code inside barrel files.
- Scenario 14: `consistent-barrel-files` reports `missingBarrel` when a folder with module files has no allowed barrel.
- Scenario 15: `consistent-barrel-files` reports `forbiddenBarrel` when enforcement is disabled and a folder contains both a module file and an allowed barrel.
- Scenario 16: `no-reexports-outside-barrels` reports `reexportNotAllowed` for `export * from` and `export { ... } from` in non-barrel files.
- Scenario 17: `no-reexports-outside-barrels` reports `reexportedImport` when a non-barrel file imports a value and immediately exports it.
- Scenario 18: full validation still surfaces repo-wide coverage debt separately from feature regressions.

## 🗂️ Test Inventory

```text
tests/e2e/barrel-files-exports-only.test.ts
  barrel-files-exports-only
    accepts empty barrel files
    accepts re-export barrels
    accepts type-only declarations
    rejects runtime barrel content

tests/e2e/consistent-barrel-files.test.ts
  consistent-barrel-files
    reports missing barrel for module folders
    reports forbidden barrel when enforce=false and module exists
    accepts custom allowedNames stems
    ignores barrel-only folders when enforce=false

tests/e2e/no-reexports-outside-barrels.test.ts
  no-reexports-outside-barrels
    rejects re-export forms in non-barrel files
    rejects import-then-export patterns
    accepts allowed barrel stems
    accepts local exports in non-barrel files

eslint.config.ts
  repo integration
    disables consistent-barrel-files for root config, scripts, and tests
```

## 🧭 Selector Contract

- Primary selectors: Not applicable.
- Fallback selectors: Not applicable.
- Testability notes: This feature is validated through rule module execution and repo config behavior, not through DOM selectors.

## 🎭 Executable Tests

- Executable end-to-end tests should use the existing `tests/e2e/*.test.ts` rule-tester harness.
- Do not introduce Playwright into this repo for this feature; there is no browser workflow to exercise.

## 🧪 Coverage Notes

- Missing cases: full repo-wide coverage closure is outside the feature-specific test scope.
- Risk areas: repo-local linting against the plugin itself, especially where source and test folders intentionally need different barrel behavior.
- Assumptions: `docs/rules/*.md` is the source of truth and retrocompatibility with the old barrel-rule option names is intentionally out of scope.

## 🔁 Handoff

- Next: 💻️ Implementation Agent / human
- Status: ready-for-handoff