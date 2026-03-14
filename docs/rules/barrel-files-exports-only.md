# `codeperfect/barrel-files-exports-only`

## Summary

Restrict barrel files to exports and declarations only.

## Enabled by

- `barrel-files`
- internal `codeperfect` plugin registry

## Why this rule exists

Barrel files should remain simple aggregation points. Import statements and executable code make barrel behavior harder to reason about and weaken architecture boundaries.

## Invalid

```ts
import { feature } from "./feature";
```

## Valid

```ts
export * from "./feature";
export { feature } from "./feature";
```
