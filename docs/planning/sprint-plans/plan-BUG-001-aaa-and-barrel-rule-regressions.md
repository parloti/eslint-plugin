# 🧩 Sprint Plan: AAA and Barrel Rule Regressions

**🐞 Bug:** BUG-001 - AAA and Barrel Rule Regressions  
Source: docs/product/bugs/bug-001-aaa-and-barrel-rule-regressions.md
**🕒 Created At:** 2026-03-29T00:00:00Z
**📌 Status:** Ready for QA

---

## 🎯 Goal

Restore correct lint behavior for the affected AAA rules and constrain the default scope of `codeperfect/consistent-barrel-files` to `**/src/**` without changing explicit configuration behavior.

Observed behavior:
- Empty commented `Arrange` sections are accepted as valid.
- Evaluated expressions inside `expect(...)` are accepted.
- `codeperfect/consistent-barrel-files` checks files too broadly by default.

Expected behavior:
- `Arrange` is optional, but if present it must contain code.
- Evaluation happens in `Act`, and `Assert` only checks previously computed values.
- Default barrel-file checking is limited to `**/src/**`.

Root-cause status: known

---

## 🧱 Tasks

1. [x] Confirm ownership and reproduction path
   - Description: Identify which existing AAA rule should own the empty-section diagnostic, confirm the evaluated-expression violation owner, and verify where the barrel-file default scope is defined.
   - Related: BUG-001

2. [x] Add failing regression coverage for AAA invalid cases
   - Description: Add or update targeted rule tests covering empty commented `Arrange` sections and evaluated expressions inside `expect(...)`, including the valid `Act` then `Assert` example.
   - Related: BUG-001

3. [x] Add failing regression coverage for barrel-file default scope
   - Description: Add or update targeted tests proving the default behavior only applies inside `src` directories while explicit configuration still overrides the default.
   - Related: BUG-001

4. [x] Fix AAA rule behavior without widening scope
   - Description: Correct the AAA rule behavior so empty commented sections are reported and evaluated expressions inside `expect(...)` are reported without autofix.
   - Related: BUG-001

5. [x] Fix barrel-file default applicability
   - Description: Update the default applicability for `codeperfect/consistent-barrel-files` to `**/src/**` and preserve explicit path configuration behavior.
   - Related: BUG-001

6. [x] Run targeted regression and full validation
   - Description: Execute focused tests for the changed rules, then complete the repo validation path and confirm the result is stable.
   - Related: BUG-001

---

## 🔀 Suggested Order

1. Confirm ownership and reproduction path
2. Add failing regression coverage for AAA invalid cases
3. Add failing regression coverage for barrel-file default scope
4. Fix AAA rule behavior without widening scope
5. Fix barrel-file default applicability
6. Run targeted regression and full validation

Parallelizable work:
- Tasks 2 and 3 can run in parallel after Task 1.
- Tasks 4 and 5 can run in parallel once their failing tests are in place.

Completion status:
- All planned BUG-001 delivery tasks are complete.
- Final review outcome is approved.
- Full repo validation passed twice on the final workspace state.

---

## ⚠️ Risks / Blockers

- No active blockers for BUG-001 delivery.
- Residual risk: the typed `prefer-vitest-incremental-casts` suites remain among the slowest tests in the matrix.
- Residual risk: queued helper logic is still duplicated between the unit and e2e support layers.

---

## 🔗 Dependencies

- Source bug definition in docs/product/bugs/bug-001-aaa-and-barrel-rule-regressions.md
- Existing AAA rule suite and tests
- Existing `codeperfect/consistent-barrel-files` rule behavior and tests
- Repo validation pipeline in package.json
- Final approved review: docs/reviews/review-BUG-001-2026-03-30T00-59-30Z.md

---

## ✅ Definition of Ready

- [x] Scope is clear
- [x] Tasks are small
- [x] Dependencies identified
- [x] Root-cause investigation is sequenced first
- [x] Ready for implementation

## ✅ Delivery Outcome

- [x] Requested AAA and barrel-rule behavior implemented
- [x] Regression coverage added and tightened
- [x] Review follow-up fixes completed
- [x] `npm run validate` passed twice on final state
- [x] Ready for QA / merge review


## 🔁 Handoff

- Next: QA Agent / human
- Status: ready-for-handoff