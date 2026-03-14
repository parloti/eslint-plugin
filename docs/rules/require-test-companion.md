# `codeperfect/require-test-companion`

## Summary

Require a matching test file for each TypeScript file and vice versa.

## Enabled by

- `test-companion`
- internal `codeperfect` plugin registry

## Why this rule exists

Keeping source files and tests paired makes gaps obvious and encourages localized, maintainable test coverage.

## Invalid

```ts
// feature.ts exists without feature.spec.ts
```

## Valid

```ts
// feature.ts and feature.spec.ts exist in the same folder
```
