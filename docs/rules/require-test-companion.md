# `codeperfect/require-test-companion`

## Summary

Require a matching test file for each TypeScript file and vice versa.

## Enabled by

- `test-companion`
- internal `codeperfect` plugin registry

## Why this rule exists

Keeping source files and tests paired makes gaps obvious and encourages localized, maintainable test coverage.

## Invalid

```text
feature.ts
```

```ts
// feature.ts
export const feature = 1;
```

```text
feature.test.ts
```

```ts
// feature.test.ts
export {};
```

## Valid

```text
feature.ts
feature.spec.ts
```

```ts
// feature.ts
export const feature = 1;
```

```ts
// feature.spec.ts
export {};
```

```text
feature.ts
feature.test.ts
```

That pairing is also valid when the repository uses `.test.ts` as the configured companion pattern.
