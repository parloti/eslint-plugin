# `codeperfect/prefer-package-subpath-imports`

## Summary

Prefer Node.js package.json `imports` aliases over relative module specifiers that resolve to the same package path.

## Enabled by

- `architecture`
- `all`
- internal `codeperfect` plugin registry

## Why this rule exists

Package `imports` aliases provide stable internal module names that do not depend on the importing file's directory depth. Using them keeps imports consistent across single-package repositories and monorepo workspaces.

## Rule Details

The rule reads the nearest `package.json` for each linted file and considers only entries in its `imports` field. A relative import, export-from specifier, or dynamic import literal is reported when its resolved package-relative path matches a declared alias target. Directory specifiers are resolved to their on-disk index files (for example `./domain` matching a `./src/domain/index.ts` target) before matching.

Supported alias forms include:

- exact aliases such as `"#config": "./src/config.json"`
- wildcard aliases such as `"#src/*": "./src/*"`
- conditional values only when every branch resolves to the same target

The rule does not report:

- bare package or `node:` specifiers
- specifiers that already start with `#`
- relative paths outside the owning package
- relative paths that do not match a declared alias target
- relative paths that stay inside the importing file's own directory when the file itself is covered by the matched alias target
- packages whose nearest `package.json` has no usable `imports` aliases

In monorepos, the nearest `package.json` defines the package boundary. Root aliases are not applied inside a workspace package unless that workspace's own `package.json` declares them.

## Autofix

The rule replaces reported specifiers with the preferred `#` alias and preserves the original quote style and query or fragment suffix.

## Invalid

With `"imports": { "#src/*": "./src/*" }` in `package.json`:

```typescript
import { value } from "../config";
```

```typescript
export { helper } from "../utils/helper";
```

```typescript
const dynamic = import("../dynamic/value");
```

## Valid

```typescript
import { value } from "#src/config";
```

```typescript
import { readFileSync } from "node:fs";
```

```typescript
import { value } from "./config";
```

```typescript
import { sibling } from "./sibling";
```

The `./config` example is valid only when `./config` does not resolve to a path covered by a declared `imports` target. The `./sibling` example is valid when `sibling.ts` lives next to the importing file inside the same alias-covered tree, because imports inside the alias's own directory stay relative.

## Notes

- The rule performs no package analysis when a file has no relative module specifiers.
- The rule reads `package.json` lazily and only for files with relative specifiers.
- Conditional aliases with `null` branches or multiple distinct targets are ignored because their resolution can vary by runtime condition.
