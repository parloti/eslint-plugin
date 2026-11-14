# Project Agent Guidance

## Unused-Code Analysis

- Keep the unused-export and unused-public-member rules independently usable.
  Share analysis internally without relying on ESLint rule execution order or
  changing the export rule's behavior.
- Keep shared syntax, reference-symbol, and dependency facts independent of rule
  options. Apply API, test, and production-scope classifications in the owning rule.
- Follow [the approved member-analysis requirements](.specs/SPEC.md) when changing
  consumer scope or pruning searches; preserve local-member checks and public API
  exemptions.
- Follow the repository's [current architecture](docs/design/architecture.md);
  folder-based pruning must not hide actual usages that violate architecture rules.

## E2E Test Boundaries

- E2E tests must consume package-owned rules through public exports such as
  `codeperfectPlugin` or its presets; do not import concrete rule
  implementations from internal modules or rely on unexported symbols.
