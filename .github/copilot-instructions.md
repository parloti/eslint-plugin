# Copilot instructions

## Project overview

This package exports an ESLint plugin plus package-owned custom rules; the root entry point [src/index.ts](src/index.ts) re-exports the default plugin object, the rule registry, and each rule module.
Package-owned custom rules are routed through [src/rules](src/rules), while the owning domain folders keep the concrete implementations.
There is no shared-config composition layer in this repository. Local lint configuration lives only in [eslint.config.ts](eslint.config.ts).

## Key patterns to follow

Keep the root package API narrow: default plugin export, named plugin export, `customRules`, and direct rule exports.
Custom rules are implemented in their owning domain folders and re-exported through [src/rules](src/rules).
Avoid reintroducing shared config builders, option types, loader registries, or compatibility aliases.

## Workflows and commands

- Build: `npm run build` (runs `clean` then `compile`), or `npm run compile` for tsc-only.
- Tests: `npm test` (Vitest). Coverage thresholds are 100% in [vitest.config.ts](vitest.config.ts).
- Lint: `npm run lint` (eslint + prettier).
- Typecheck: `npm run typecheck`.

## Repo-specific notes

The repo’s own ESLint config is in [eslint.config.ts](eslint.config.ts) and consumes the plugin directly.
Specs live in [src/\*\*/.spec.ts](src/index.spec.ts) and use Vitest.
