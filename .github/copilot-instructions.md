# Copilot instructions

## Project overview

- This package exports a shareable flat ESLint config; entry point `config()` in [src/index.ts](src/index.ts) composes plugin configs and returns `defineConfig(...)`.
- Configuration is still owned by the domain folders, but shared config entrypoints are routed through [src/configs](src/configs). Each module returns `Linter.Config[]` (often async), while package-owned custom rules are routed through [src/rules](src/rules).
- Optional plugins are loaded via dynamic `import()` and must safely return `[]` if unavailable (see `vitest()` in [src/testing/vitest.ts](src/testing/vitest.ts)).

## Key patterns to follow

- Core configs are always included: `eslint()`, `resolver()`, `typescript()`; optional plugins are filtered via `isPluginDisabled()` using the `PluginName` union in [src/types.ts](src/types.ts).
- Prefer `defineConfig()` from eslint/config and return arrays of `Linter.Config` (not a single object), consistent with existing modules like [src/core/eslint.ts](src/core/eslint.ts) and [src/docs/comments.ts](src/docs/comments.ts).
- Custom rules are implemented in their owning domain folders and re-exported through [src/rules](src/rules); for example `requireExampleLanguageRule` is still wired into [src/docs/jsdoc.ts](src/docs/jsdoc.ts).
- Import resolver settings for both import-x and eslint-plugin-import are centralized in `resolver()` ([src/core/resolver.ts](src/core/resolver.ts)).

## Workflows and commands

- Build: `npm run build` (runs `clean` then `compile`), or `npm run compile` for tsc-only.
- Tests: `npm test` (Vitest). Coverage thresholds are 100% in [vitest.config.ts](vitest.config.ts).
- Lint: `npm run lint` (eslint + prettier); `npm run check:rules` validates the repo config with eslint-config-prettier.
- Typecheck: `npm run typecheck`.

## Repo-specific notes

- The repo’s own ESLint config is in [eslint.config.ts](eslint.config.ts) and uses `config()` with some plugins disabled for local development.
- Specs live in [src/\*\*/\*.spec.ts](src/index.spec.ts) and use Vitest with module mocking via `vi.doMock()`.
