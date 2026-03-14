# `codeperfect/no-reexports-outside-barrels`

## Summary

Disallow re-exporting imported values outside configured barrel files.

## Enabled by

- `barrel-files`
- internal `codeperfect` plugin registry

## Why this rule exists

Re-exports should stay inside designated barrels. Non-barrel modules should only export values they define locally, otherwise package surfaces become harder to trace and the barrel-file architecture loses its value.

## Invalid

```ts
import { feature } from "./dependency";
export { feature };
```

## Valid

```ts
export const feature = 1;
```
