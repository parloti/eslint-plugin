# `codeperfect/require-test-companion`

## Summary

Require each TypeScript source file to have a matching test file, and each test file to have a matching source file.

## Enabled by

- `test-companion`
- internal `codeperfect` plugin registry

## Why this rule exists

Keeping source files and their tests paired:

- makes missing coverage immediately visible
- encourages localized and maintainable tests
- prevents orphaned or outdated test files

## Rule Details

### What the rule targets

- TypeScript source files (`.ts`, optionally `.tsx`)
- Test files matching configured patterns (e.g. `.test.ts`, `.spec.ts`)

### What counts as a companion

A companion file:

- shares the same base filename
- differs only by the test suffix

Examples:

| Source file     | Test file          |
|----------------|--------------------|
| `feature.ts`   | `feature.test.ts`  |
| `feature.ts`   | `feature.spec.ts`  |

### Supported patterns

- `.test.ts`
- `.spec.ts`

The active pattern depends on project configuration.

### Required behavior

- Every source file must have exactly one matching test file
- Every test file must have a corresponding source file

### Disallowed patterns

- source files without a test companion
- test files without a source file
- mismatched naming (different base names)
- multiple competing companions for the same source (when only one pattern is configured)

## Invalid

### Source file without test

```tree
feature.ts
```

```typescript
// feature.ts
export const feature = 1;
```

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
feature-utils.test.ts // ❌ does not match base name
```

### Conflicting companions (single-pattern config)

```tree
feature.ts
feature.test.ts
feature.spec.ts // ❌ extra companion when only one pattern is allowed
```

## Valid

### `.spec.ts` pairing

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

### `.test.ts` pairing

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

* This rule does not enforce:

  * test content quality
  * test coverage depth
* This rule operates purely on file presence and naming conventions