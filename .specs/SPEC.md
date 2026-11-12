# Unused Public Member Analysis

## Purpose

Make `no-unused-public-members` complete on the reported large project without
raising Node.js's default heap limit. Reduce repeated analysis rather than
silently skipping supported member usages.

This specification defines the intended optimization and scope change. Existing
rule behavior is documented in [the member rule reference](../docs/rules/no-unused-public-members.md)
and [the export rule reference](../docs/rules/no-unused-exports.md).
The scope requirements below take precedence for this work; other documented
member-rule behavior remains applicable.

## Requirements

### Package-local usage

- Derive analysis folders from the parent directories of actual files matched
  by `publicApiFiles`, not a guessed common ancestor of glob patterns.
- An internal barrel is a file that forwards exports from other files. Its name
  (`index.ts`, for example) does not make it an API entry or an analysis boundary.
  Only configured API matches define roots. Do not introduce a barrel-only
  traversal option in this work.
- Search for a host's member usages only inside its own analysis folder and
  descendants. A host is the class, interface, type alias, or const object that
  declares the member.
- Do not search sibling packages for consumers, even when their public API files
  also match the configured patterns or their sources are in the same TypeScript
  program.
- Retain the public API exemption: members exposed through the configured public
  API remain exempt without local consumers.
- Retain same-file member analysis, including hosts that are never imported.
- Retain test-file exclusions and framework-neutral versus Angular-adapter
  behavior.

### Folder ownership and configuration

- Resolve API matches from source files available in the active TypeScript
  program. Test files and declaration files do not define analysis roots.
- Use the effective member-rule options for the linted file and the existing
  TypeScript project root for relative paths and glob matching. Do not union roots
  from unrelated ESLint configuration overrides.
- Normalize absolute paths and separators before matching or comparing paths;
  honor filesystem case sensitivity. Determine containment by path components,
  not string prefixes: `src-other` is not inside `src`.
- Deduplicate roots that resolve to the same folder. Multiple API entry files in
  one folder share that folder without conflict.
- Reject distinct roots when one contains another. Report an actionable
  configuration error naming the conflicting entries and folders. Do not choose
  the deepest root or silently combine the roots.
- Assign each host to its unique containing root. If no eligible API entry
  matches, or a host lies outside every configured root, report an actionable
  configuration error identifying the missing coverage and relevant
  `publicApiFiles` configuration. Do not search the whole project, silently skip
  the host, or emit member findings based on missing scope information.
- An API entry below the package's source root defines only its exact parent
  folder. Do not infer a package root from package metadata or a directory name.
- Reuse `publicApiFiles` and existing configuration inputs; do not introduce
  `analysisRoots` or a runtime dependency on `eslint-plugin-boundaries` in this
  work.

The following illustrative paths assume the files are eligible sources in the
active program. File globs use `/` separators.

| Configured API matches                                               | Host or consumer                                                | Required outcome                                                                        |
| -------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `packages/pkg1/src/index.ts`, `packages/pkg2/src/index.ts`           | A host under `pkg1/src`                                         | Only production consumers under `pkg1/src` count; consumers in `pkg2/src` are excluded. |
| `packages/pkg1/src/index.ts`                                         | `pkg1/src/feature1` imports through `pkg1/src/feature/index.ts` | Both features share `pkg1/src`; the ordinary feature barrel creates no boundary.        |
| `packages/pkg1/src/index.ts`, `packages/pkg1/src/feature/index.ts`   | A host in either folder                                         | Configuration error: the explicitly selected roots overlap.                             |
| `packages/pkg1/src/index.ts`, `packages/pkg1/src/public.ts`          | A host under `pkg1/src`                                         | Both entries share one root; no overlap error.                                          |
| `packages/pkg1/src/api/public.ts`                                    | A host under `pkg1/src/api`                                     | Its root is exactly `pkg1/src/api`.                                                     |
| `packages/pkg1/src/api/public.ts`                                    | A host under `pkg1/src/service`                                 | Configuration error: the host is not covered; do not broaden to `pkg1/src`.             |
| No eligible matches, including test-only or declaration-only matches | A candidate host                                                | Configuration error; no unsupported unused-member finding.                              |
| Default `**/src/index.ts`                                            | `packages/pkg1/src/feature/index.ts`                            | The feature barrel does not match that pattern and defines no additional root.          |

### Compatible rule integration

- Keep `no-unused-exports` and `no-unused-public-members` as separate public rules.
- Share internal import/reference analysis where useful. Each rule must work when
  enabled alone; neither may depend on the other's execution order.
- Preserve `no-unused-exports` options, diagnostics, usage classification, and
  consumer scope. The new package-local scope belongs to the member rule.
- Use imports to narrow cross-file work, not to require an import before checking
  a member. Preserve valid indirect, contract-based, and local usages.
- Evaluate folder classifications inspired by `eslint-plugin-boundaries` as an
  optimization. Folder names or permitted dependency directions alone are not
  proof that an actual usage is absent.

### Performance and correctness

- Measure runtime and peak memory against the failing project with unchanged
  diagnostics except for the approved exclusion of out-of-scope consumers.
- Verify completion without a heap-limit override; also run a reproducible
  constrained-heap check with `--max-old-space-size=4096`.
- Preserve supported member semantics while removing repeated operation scans
  and unnecessary type expansion.
- Do not silently classify an unfinished or unsupported analysis as an absent
  usage to meet the memory target.

## Benchmark Setup

- Use `C:\Users\Alex\Dev\lifelog` as the baseline project. Its four package
  `src/index.ts` entries provide concrete examples of independent analysis roots.
- Measure two datasets: the 265 tracked TypeScript files in the four application
  packages and root tooling, and those same files plus a synthetic recursive API
  builder fixture. The fixture has eight differently instantiated child-builder
  properties and is temporarily exposed through the layers package's API entry.
  Keep the original project and synthetic results distinct.
- Use the existing typed ESLint configuration with `projectService: true`, no
  ESLint result cache, and no lint concurrency. Change only the two unused-code
  rule severities between control scenarios.
- The runtime target is at most **45 seconds wall time**, measured as the median
  of three fresh sequential Node processes for each dataset with both
  working-source rules enabled. Verify separately with Node's default heap and
  `--max-old-space-size=4096`, with `NODE_OPTIONS` unset, on the baseline
  environment recorded with the
  [measured performance](../docs/design/architecture.md#measured-performance).
- Preserve the same loader and measurement overhead for before/after comparison.
  Record peak process working set separately from observed used-heap high water;
  garbage-collection and phase samples do not guarantee a continuous heap peak.
- Restore temporary fixture and API-entry changes after measurements. Retain
  input hashes, commands, results, diagnostics, and the fixture generator in the
  local benchmark evidence, not in application production code.

## References

- Measured performance and limits: [architecture.md](../docs/design/architecture.md#measured-performance)
- Current architecture: [architecture.md](../docs/design/architecture.md)
