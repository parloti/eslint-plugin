# `codeperfect/no-reexports-outside-barrels`

## Summary

Disallow re-exporting values from other modules outside configured barrel files.

## Enabled by

- `barrel-files`
- internal `codeperfect` plugin registry

## Why this rule exists

Re-exports should be centralized in designated barrel files. Allowing them in regular modules makes module boundaries harder to follow and weakens the intended architecture.

Non-barrel modules should only export values they define locally.

## Options

```typescript
type Options = {
  allowedBarrelNames?: string[]; // default: ["index"]
};
```

* `allowedBarrelNames`

  * Defines which filenames are treated as barrel files

## Rule Details

* A **re-export** is any export that forwards values from another module:

  * `export * from "./x"`
  * `export { foo } from "./x"`
  * `export { foo as bar } from "./x"`
* Re-exports are only allowed in files whose name matches `allowedBarrelNames`
* Non-barrel files must not:

  * re-export from another module
  * import a value and immediately export it

### Allowed in non-barrel files

* exporting locally defined values
* exporting locally declared functions, classes, or constants

### Allowed in barrel files

* all forms of re-export

## Invalid

### Re-export in non-barrel file

```typescript
export * from "./dependency";
```

```typescript
export { feature } from "./dependency";
```

### Import + export (re-export pattern)

```typescript
import { feature } from "./dependency";
export { feature };
```

```typescript
import { feature as baseFeature } from "./dependency";
export { baseFeature as feature };
```

## Valid

### Barrel file (e.g. index.ts)

```typescript
// index.ts
export * from "./feature";
```

```typescript
// index.ts
export { feature } from "./feature";
```

### Local exports

```typescript
export const feature = 1;
```

```typescript
function createFeature() {
  return 1;
}

export { createFeature };
```

```typescript
export function run() {
  return 1;
}
```