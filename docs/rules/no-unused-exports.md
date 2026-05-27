# `codeperfect/no-unused-exports`

## Summary

Disallow exports that are never consumed by production code.

The rule reports:

- exports with no consumers at all
- exports consumed only by test files

## Enabled by

- internal `codeperfect` plugin registry
- `architecture` preset

## Why this rule exists

`no-unused-vars` intentionally ignores exported bindings. That behavior is useful for public APIs, but it can hide dead exports and test-only exports that should not remain in production modules.

This rule complements `no-unused-vars` by checking cross-file usage and ensuring exports are consumed by non-test code.

For this rule, consumption means one concrete symbol reference in another non-test file. Bare imports and ordinary forwarding exports are not concrete usage.

Classification rules:

- references from files matching `testFilePatterns` never satisfy production usage
- exports exposed by files matching `publicApiFiles` satisfy production usage
- `publicApiFiles` exposure can be direct or transitive through barrel files
- `import { X }` without any concrete reference to `X` does not count
- type exports must be referenced in type positions
- value exports must be referenced in value positions
- `typeof X` counts as a concrete value reference to `X` even when it appears inside a type

## Options

```typescript
type Options = {
  publicApiFiles?: string[]; // default: ["**/src/index.ts", "**/test-utils/**/*.ts", "tests/support/**/*.ts"]
  testFilePatterns?: string[]; // default: ["**/*.{test,spec,e2e}.ts"]
};
```

- `publicApiFiles`
  - File globs that define public API export surfaces
  - Exports and re-exports reachable from these files count as production usage
- `testFilePatterns`
  - File globs treated as tests when classifying consumers

## Rule Details

The rule checks these export kinds:

- named value exports
- named type exports
- default exports
- local export specifiers backed by declarations in the same file

By default, the rule analyzes files matching `**/src/**/*.ts`.

The rule currently detects production consumption from:

- concrete cross-file symbol references in non-test files
- direct or transitive export exposure through files matching `publicApiFiles`

Ordinary pass-through re-export statements (`export ... from` and `export * from`) are treated as API forwarding only:

- they do not count as consumption of declaration files
- they do not create declaration diagnostics in the forwarding file

The exception is a pass-through re-export that is reachable from a `publicApiFiles` file. In that case, the public API file intentionally exposes the original symbol, so the original export is considered consumed by production code.

Dynamic runtime loading patterns are not considered consumers.

A reported export falls into one of two categories:

- **unusedExport**: no concrete non-test usage consumes it
- **usedOnlyInTests**: only test files consume it

One additional non-reported path exists:

- **publicApiExposure**: the export is reachable from a file matching `publicApiFiles`

## Invalid

### Fully unused export

```typescript
// src/feature.ts
export const orphan = 1;
```

### Export consumed only by test files

```typescript
// src/feature.ts
export const feature = 1;
```

```typescript
// src/feature.spec.ts
import { feature } from "./feature";
void feature;
```

### Forwarded only by a non-public barrel

```typescript
// src/feature.ts
export const feature = 1;
```

```typescript
// src/reexport.ts
export { feature } from "./feature";
```

## Valid

### Export consumed by production code

```typescript
// src/feature.ts
export const feature = 1;
```

```typescript
// src/consumer.ts
import { feature } from "./feature";
console.log(feature);
```

### Export exposed by a public API file

```typescript
// src/presets.ts
export const aaa = {};
```

```typescript
// src/infrastructure.ts
export { aaa } from "./presets";
```

```typescript
// src/index.ts
export { aaa } from "./infrastructure";
```

### Public API file declaration

```typescript
// src/index.ts
export const barrel = 1;
```

### Value export referenced through `typeof`

```typescript
// src/feature.ts
export const feature = { id: 1 } as const;
```

```typescript
// src/consumer.ts
import { feature } from "./feature";
export type FeatureShape = typeof feature;
```
