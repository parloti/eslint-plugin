# `codeperfect/require-test-companion`

## Summary

Require each test file to have a matching TypeScript source file.

## Enabled by

- `test-companion`
- internal `codeperfect` plugin registry

## Why this rule exists

Keeping test files tied to concrete source files:

- prevents orphaned or outdated test files

## Rule Details

### What the rule targets

- Test files matching configured patterns (e.g. `.test.ts`, `.spec.ts`)

### What counts as a companion

A matching source file:

- shares the same base filename
- uses the TypeScript `.ts` extension

Example:

| Test file         | Required source |
| ----------------- | --------------- |
| `feature.test.ts` | `feature.ts`    |
| `feature.spec.ts` | `feature.ts`    |

### Supported patterns

- `.test.ts`
- `.spec.ts`

The active pattern depends on project configuration.

### Required behavior

- Every test file must have a corresponding source file

### Disallowed patterns

- test files without a source file
- mismatched naming (different base names)

## Invalid

### Test file without source

```tree
feature.test.ts
```

```typescript
// feature.test.ts
export {};
```

### Mismatched names

```tree
feature.ts
feature-utils.test.ts // ❌ expects feature-utils.ts
```

## Valid

### `.spec.ts` with matching source

```tree
feature.ts
feature.spec.ts
```

```typescript
// feature.ts
export const feature = 1;
```

```typescript
// feature.spec.ts
export {};
```

### `.test.ts` with matching source

```tree
feature.ts
feature.test.ts
```

```typescript
// feature.ts
export const feature = 1;
```

```typescript
// feature.test.ts
export {};
```

### Configured pattern flexibility

If the project is configured to use `.test.ts`, then:

```tree
feature.ts
feature.test.ts
```

is valid, and `.spec.ts` companions are not expected.

## Notes

- This rule does not require every source file to have tests.
- This rule does not enforce test content quality or coverage depth.
- This rule operates purely on file presence and naming conventions.
