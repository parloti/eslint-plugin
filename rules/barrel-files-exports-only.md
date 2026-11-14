# `codeperfect/barrel-files-exports-only`

## Summary

Restrict barrel files to local re-export statements and type-only declarations. Disallow exports from outside the barrel folder tree, imports, executable code, and runtime logic.

## Enabled by

- `barrel-files`
- internal `codeperfect` plugin registry

## Why this rule exists

Barrel files should remain simple aggregation points. Introducing imports or executable logic makes module boundaries harder to reason about, increases coupling, and can lead to unexpected side effects.

## Rule Details

- Barrel files may contain:
  - `export` statements whose targets resolve to the barrel's folder or one of its descendant folders (e.g. `export * from`, `export { ... } from`)
  - type-only declarations and specifier exports (e.g. `export type * from`, `export { type ... } from`, `export type { ... }`)
- Barrel files must not contain:
  - `import` statements
  - variable declarations (`const`, `let`, `var`)
  - function or class implementations
  - executable code (e.g. function calls, conditionals)
- Files that are empty (e.g. placeholder `index.ts`) are allowed

## Invalid

```typescript
import { feature } from "./feature";
export { feature };
```

```typescript
// disallows runtime logic
export const value = 1;
```

```typescript
// disallows function declarations
export function run() {
  return 1;
}
```

```typescript
// disallows side effects
console.log("loaded");
```

## Valid

```typescript
export * from "./feature";
```

```typescript
export { feature } from "./feature";
```

```typescript
export type { Feature } from "./feature";
```

```typescript
// shared/index.ts may aggregate modules within shared/ and its descendants
export { Feature } from "./feature";
export type { NestedFeature } from "./nested/feature";
```

```typescript
// index.ts (empty barrel file)
```

```typescript
// non-barrel file (allowed to import)
import { feature } from "./dependency";
```

## Invalid export sources

Re-exporting from a sibling folder, another workspace, or an installed package is invalid. When TypeScript parser services are available, the rule checks the resolved file, including configured path aliases.

```typescript
// apps/automation/src/shared/index.ts
export type { AutomationBridgeCommandMessage } from "@forex/api-contract";
```
