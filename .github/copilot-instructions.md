# Copilot instructions

## Project overview

- This package publishes package-owned ESLint rules, the `codeperfectPlugin` plugin object, rule presets, and the `customRules` registry from [src/index.ts](../src/index.ts).
- Concrete rule implementations live under [src/domain](../src/domain); package-level orchestration lives under [src/application](../src/application); ESLint-facing adapters live under [src/infrastructure](../src/infrastructure).
- The repo’s own architecture enforcement is configured in [eslint.config.ts](../eslint.config.ts) through the shared `config()` factory plus a repository-owned `boundaries` overlay.

## Key patterns to follow

- Keep rule implementation behavior in [src/domain](../src/domain) and keep package wiring concerns out of the rule folders unless the code is strictly local support for that rule.
- Use [src/application/index.ts](../src/application/index.ts) and [src/application/custom-rules.ts](../src/application/custom-rules.ts) for package-level aggregation of domain rules.
- Keep ESLint plugin objects and preset config assembly in [src/infrastructure](../src/infrastructure).
- Preserve the public export surface from [src/index.ts](../src/index.ts) unless the task explicitly changes package API.

## Workflows and commands

- Build: `npm run build` (runs `clean` then `compile`), or `npm run compile` for tsc-only.
- Tests: `npm test` (Vitest). Coverage thresholds are 100% in [vitest.config.ts](../vitest.config.ts).
- Lint: `npm run lint` (eslint + prettier); `npm run check:rules` validates the repo config with eslint-config-prettier.
- Typecheck: `npm run typecheck`.

## Repo-specific notes

- The repo’s own ESLint config is in [eslint.config.ts](../eslint.config.ts) and uses `config()` with some plugins disabled for local development.
- Specs live in [src](../src) and use Vitest with module mocking via `vi.doMock()`.
