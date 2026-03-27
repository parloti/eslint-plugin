# 🧩 Sprint Plan: Rule Spec Alignment

**🏛️ Epic:** EPIC-017 - Adopt Updated Plugin Rule Specifications  
Source: `docs/rules/*.md`
**🚀 Feature:** FEAT-017 - Align Rule Implementations To New Specs  
Source: `docs/rules/*.md`
**🧾 User Story:** US-017 - Replace Current Rule Behavior With Updated Specifications  
Source: `docs/rules/*.md`
**🕒 Created At:** 2026-03-26T20:54:31Z
**📌 Status:** Draft

---

## 🎯 Goal

Bring the plugin implementation, tests, and repo integration into line with the updated rule specifications in `docs/rules/`, without preserving the previous public rule option contracts.

This work is already partially underway. The main remaining delivery risk is repo-wide validation, especially the existing global 100% coverage gate.

---

## 🧱 Tasks

1. [ ] Finalize barrel-rule contract changes
	- Description: Complete and review the public contract changes for `barrel-files-exports-only`, `consistent-barrel-files`, and `no-reexports-outside-barrels`, including option names, allowed barrel naming model, and applicability rules.
	- Related: US-017

2. [ ] Stabilize barrel-rule repo integration
	- Description: Ensure the repo’s own ESLint configuration uses the new barrel rules intentionally, with explicit local overrides where root config, scripts, or tests should not participate in barrel enforcement.
	- Related: US-017

3. [ ] Reconcile remaining rule-spec mismatches outside barrel rules
	- Description: Re-check the other 14 documented rules against their updated markdown specs and close any remaining gaps in behavior, metadata, schemas, or messages.
	- Related: US-017

4. [ ] Refresh metadata and registry expectations
	- Description: Update rule registry metadata, package-owned rule summaries, and any tests that assert descriptions, schemas, or exported rule identities.
	- Related: US-017

5. [ ] Expand targeted tests for changed rule behavior
	- Description: Add or adjust focused unit tests only for changed behaviors, especially new barrel detection semantics, removed retrocompatibility, and allowed type-only barrel declarations.
	- Related: US-017

6. [ ] Run focused validation for changed areas
	- Description: Execute rule-folder test subsets and lint/typecheck checks for touched files until the changed areas are stable and deterministic.
	- Related: US-017

7. [ ] Resolve full validation blockers
	- Description: Work through repo-wide validation failures that remain after the rule updates, separating true regressions introduced by this feature from pre-existing coverage debt.
	- Related: US-017

8. [ ] Close validation and release-readiness pass
	- Description: Run `npm run validate` twice, confirm the rule docs still match implemented behavior, and verify the feature is ready for handoff.
	- Related: US-017

---

## 🔀 Suggested Order

1. Finalize barrel-rule contract changes
2. Stabilize barrel-rule repo integration
3. Refresh metadata and registry expectations
4. Expand targeted tests for changed rule behavior
5. Reconcile remaining rule-spec mismatches outside barrel rules
6. Run focused validation for changed areas
7. Resolve full validation blockers
8. Close validation and release-readiness pass

Parallelizable work:
- Tasks 3 and 4 can run in parallel once Task 1 is stable.
- Task 5 can start as Task 1 and Task 3 finish.

---

## ⚠️ Risks / Blockers

- The repo currently has an existing global 100% coverage requirement, and recent validation runs show broad unrelated coverage gaps.
- Removing retrocompatibility may require touching tests or internal repo config that still assume the old option shape.
- Repo-local linting of the plugin against itself can surface integration failures that are not visible in isolated rule tests.

---

## 🔗 Dependencies

- Updated source-of-truth specs in `docs/rules/*.md`
- Current local ESLint repo configuration in `eslint.config.ts`
- Validation pipeline in `package.json` (`lint`, `typecheck`, `test`, `build`, `pack`)

---

## ✅ Definition of Ready

- [x] Scope is clear
- [x] Tasks are small
- [x] Dependencies identified
- [ ] Full validation path is green
- [ ] Remaining non-barrel rule mismatches explicitly confirmed

## 🔁 Handoff

- Next: 💻️ Implementation Agent or human
- Status: ready-for-handoff
