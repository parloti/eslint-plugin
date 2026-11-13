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

## The Problem with Exporting for Testing Only

Exporting an internal helper, type, or function solely so a test file can import it is a common anti-pattern:

- **Breaks Encapsulation**: Exposing internal details pollutes your public API and makes it unclear what parts of the module are meant to be used by the rest of the application. Consumers of the module cannot distinguish between intentional public interfaces and accidental implementation details.
- **Ties Tests to Implementation**: If you test private functions directly, refactoring, restructuring, or renaming those internal functions will break your unit tests, even if the public behavior of the module remains completely unchanged. Tests should verify observable behavior and contracts rather than private mechanics.
- **Smell of Design Issues**: Needing to export a private function often means the module is doing too much (violating the Single Responsibility Principle) and should be split into smaller, independent services or utility classes.

### Better Alternatives

- **Test Through Public Methods**: Write your tests against the public API (the functions or classes that are already exported and meant to be consumed). If the public methods work correctly, the internal helper functions are verified by extension.
- **Extract a Separate Helper Module**: If a private function is complex enough that it needs its own dedicated unit tests, extract it into its own separate module or utility file and export it properly from there (where the original module imports and consumes it in production).
- **Move to Test Utilities**: If the symbol is genuinely only needed for testing (such as mock data factories, fixtures, or test assertion helpers), move it to a test file or a dedicated test utilities folder outside production source code.

## Options

```typescript
type Options = {
  publicApiFiles?: string[]; // default: ["**/src/index.ts", "**/__tests__/**/*.ts"]
  testFilePatterns?: string[]; // default: ["**/*.{test,spec,e2e}.ts", "**/__tests__/**/*.ts"]
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

### Performance

The rule scans each TypeScript Program once and shares a symbol usage index
across exports and linted files. Public API exposure is indexed alongside
concrete references. File classifications are cached separately for each
repository root and option set.

Source syntax catalogs and native reference-symbol lookups are shared with
`no-unused-public-members` when both rules run. These facts contain no API,
test-file, or ownership classifications; each rule applies its own policy.
Import/dependency edges do not turn bare imports or dynamic loading into
concrete export usage.

Caches are scoped to the parser's Program object through weak references. A new
Program receives a fresh index, so editor updates do not reuse an old Program's
analysis. Separate TypeScript projects each require their own scan.

The member rule's analysis folders do not restrict this rule's consumers.
Both rules work independently and in either execution order. See the
[measured export controls](../design/architecture.md#measured-performance)
for diagnostic equivalence and timing limits of the reference workloads.

## Invalid

### Fully unused export

```typescript
// src/feature.ts
// Reported: Export 'orphan' is never consumed by any file in the project;
// remove the export or delete the symbol if it is no longer needed.
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

### Internal helper exported solely for tests

```typescript
// src/order.ts
// BAD: calculateTax is internal logic exported solely for test files
export function calculateTax(amount: number): number {
  return amount * 0.2;
}

export function createOrder(amount: number): { total: number } {
  return { total: amount + calculateTax(amount) };
}
```

```typescript
// src/order.spec.ts
import { calculateTax } from "./order";

// Reported: Export 'calculateTax' is consumed only by test files.
// Avoid exporting for tests: test through the public API, extract to a separate helper module, or move to test utilities.
test("calculates tax", () => {
  expect(calculateTax(100)).toBe(20);
});
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

### Alternative 1: Test through public API (keep helper unexported)

```typescript
// src/order.ts
// GOOD: helper remains unexported and private to the module
function calculateTax(amount: number): number {
  return amount * 0.2;
}

export function createOrder(amount: number): { total: number } {
  return { total: amount + calculateTax(amount) };
}
```

```typescript
// src/order.spec.ts
import { createOrder } from "./order";

// GOOD: Unit test verifies the observable public API
test("creates order with tax included", () => {
  expect(createOrder(100)).toEqual({ total: 120 });
});
```

### Alternative 2: Extract a separate helper module

```typescript
// src/tax-calculator.ts
// GOOD: Complex logic extracted to its own module and exported for production use
export function calculateTax(amount: number): number {
  return amount * 0.2;
}
```

```typescript
// src/order.ts
import { calculateTax } from "./tax-calculator";

export function createOrder(amount: number): { total: number } {
  return { total: amount + calculateTax(amount) };
}
```

```typescript
// src/tax-calculator.spec.ts
import { calculateTax } from "./tax-calculator";

test("calculates tax", () => {
  expect(calculateTax(100)).toBe(20);
});
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
