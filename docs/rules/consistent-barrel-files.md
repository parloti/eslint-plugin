# `codeperfect/consistent-barrel-files`

## Summary

Enforce or forbid barrel files with consistent, allowed names.

## Enabled by

- `barrel-files`
- internal `codeperfect` plugin registry

## Why this rule exists

Repositories should choose a clear barrel-file strategy. Mixed naming or partially-adopted barrels create ambiguous import surfaces and inconsistent folder conventions.

## Invalid

```ts
// feature/index.ts is missing when barrels are required
```

## Valid

```ts
// feature/index.ts exists when the folder requires a barrel
```
