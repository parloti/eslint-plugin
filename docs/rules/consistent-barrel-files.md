# `codeperfect/consistent-barrel-files`

## Summary

Enforce or forbid barrel files with consistent, allowed names.

## Enabled by

- `barrel-files`
- internal `codeperfect` plugin registry

## Why this rule exists

Repositories should choose a clear barrel-file strategy. Mixed naming or partially-adopted barrels create ambiguous import surfaces and inconsistent folder conventions.

## Invalid

```text
feature/
	feature.ts
```

```text
feature/
	feature.ts
	index.ts
```

With `{ enforce: false }`, the second structure is invalid because the folder contains a forbidden barrel file.

## Valid

```text
feature/
	feature.ts
	index.ts
```

```ts
// feature/index.ts
export * from "./feature";
```

```ts
// feature/feature.ts
export const feature = 1;
```

```text
feature/
	feature.ts
```

That last structure is also valid when the rule is configured with `{ enforce: false }`.
