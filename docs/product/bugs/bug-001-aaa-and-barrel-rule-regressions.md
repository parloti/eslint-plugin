# 🐞 Bug: AAA and Barrel Rule Regressions

**🆔 ID:** BUG-001
**🔥 Severity:** P2
**🕒 Created At:** 2026-03-29T00:00:00Z
**📌 Status:** Ready for planning

## 🚩 Problem Summary

Several lint-rule behaviors in this repository currently allow invalid test patterns or apply rule checks more broadly than intended. These defects reduce trust in rule output and can permit incorrect tests or configuration usage to pass without feedback.

## 👀 Observed Behavior

- AAA section validation currently treats an `Arrange` section with only comments or whitespace as valid.
- AAA validation currently allows evaluated expressions inside `expect(...)`, such as `expect(getRuleKeys(core))`, instead of requiring evaluation to happen in `Act`.
- `codeperfect/consistent-barrel-files` currently checks files more broadly than intended by default instead of limiting default checks to `**/src/**`.

## ✅ Expected Behavior

- `Arrange` remains optional, but if an `Arrange` section is present it must contain code. Comments alone do not satisfy the section.
- Expressions evaluated for assertions must be computed in `Act`; `Assert` should only assert against already computed values. Violations must be reported and must not be autofixed.
- By default, `codeperfect/consistent-barrel-files` only checks files inside `src` directories, equivalent to `**/src/`, while explicit rule configuration remains unchanged.

## 🌍 Impact Scope

- Affected users or systems: Maintainers and consumers relying on this package's AAA-related rules and barrel-file consistency rule.
- Urgency: Medium. This is a rule-correctness issue that can allow invalid patterns or unexpected lint coverage.
- Known trigger: Running the affected rules against tests or project files matching the examples in the source request.

## 🚧 Scope

- In scope:
  - Correct AAA behavior for empty commented `Arrange` sections.
  - Correct AAA behavior for evaluated expressions inside `expect(...)`.
  - Correct default scope for `codeperfect/consistent-barrel-files` to `**/src/**`.
  - Update rule coverage so these behaviors are explicitly represented.
- Out of scope:
  - Redesigning the AAA rule set beyond the behaviors above.
  - Introducing autofix for evaluated expressions inside `expect(...)`.
  - Changing explicitly configured paths for `codeperfect/consistent-barrel-files`.

## ✅ Acceptance Criteria

- [ ] A test containing an `Arrange` section with only comments or whitespace is reported as invalid.
- [ ] If an autofix is provided for the empty `Arrange` case, it only removes the empty section or merges it with an existing `Act` section when safe.
- [ ] A test that evaluates an expression inside `expect(...)` is reported as invalid.
- [ ] The evaluated-expression AAA violation has no autofix.
- [ ] A test that computes a value in `Act` and only asserts against that value in `Assert` remains valid.
- [ ] `codeperfect/consistent-barrel-files` defaults to checking only files inside `src` directories.
- [ ] Explicit configuration for `codeperfect/consistent-barrel-files` continues to override the default scope.

## ⚠️ Notes

- Root-cause status: unknown
- Assumption: These AAA defects belong within the existing AAA-related rule set rather than requiring a new rule.
- Assumption: The intended default path behavior for `codeperfect/consistent-barrel-files` is effectively `**/src/**`.
- Open question: Which existing AAA rule should be the canonical source of the empty-section diagnostic and any safe autofix.

## 🔁 Handoff

- Next: Scrum Master Agent
- Status: ready-for-handoff