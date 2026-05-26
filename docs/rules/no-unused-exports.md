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

## Options

```typescript
type Options = {
  allowInFiles?: string[]; // default: ["**/src/index.ts", "**/test-util/**/*.ts", "test/support/**/*.ts"]
  testFilePatterns?: string[]; // default: ["**/*.{test,spec}.ts", "tests/e2e/**/*.ts"]
};
```

- `allowInFiles`
  - File globs where unused exports are intentionally allowed
- `testFilePatterns`
  - File globs treated as tests when classifying consumers

## Rule Details

The rule checks these export kinds:

- named value exports
- named type exports
- default exports
- re-export specifiers and wildcard re-exports

A reported export falls into one of two categories:

- **unusedExport**: no imports/re-exports consume it
- **usedOnlyInTests**: only test files consume it

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

### Allowlisted file

```typescript
// src/index.ts
export const barrel = 1;
```
