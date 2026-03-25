# `codeperfect/no-multiple-declarators`

## Summary

Require exactly one variable declarator per declaration statement.

## Enabled by

- `core`
- internal `codeperfect` plugin registry

## Why this rule exists

Splitting declarations improves readability, produces cleaner diffs, and avoids coupling unrelated variables in a single statement.

## Rule Details

- Each `const`, `let`, or `var` declaration must declare exactly one variable
- Multiple declarators in a single statement are disallowed, regardless of formatting
- The rule applies to:
  - standalone declarations
  - exported declarations

### Examples of disallowed patterns

- comma-separated declarators
- multi-line declarator lists
- declarators separated by comments

## Invalid

```typescript
const availableRules = new Set(Object.keys(rules ?? {})),
  customError = buildCustomErrorRules(availableRules);
```

```typescript
export const availableRules = new Set(Object.keys(rules ?? {})),
  customError = buildCustomErrorRules(availableRules);
```

```typescript
const availableRules = new Set(Object.keys(rules ?? {})),
  /* keep */ customError = buildCustomErrorRules(availableRules);
```

## Valid

```typescript
const availableRules = new Set(Object.keys(rules ?? {}));
const customError = buildCustomErrorRules(availableRules);
```

```typescript
let count = 0;
```

```typescript
var value = compute();
```

```typescript
export const availableRules = new Set(Object.keys(rules ?? {}));
export const customError = buildCustomErrorRules(availableRules);
```

## Autofix

Splits multi-declarator statements into multiple single-declarator statements.

### Before

```typescript
const availableRules = new Set(Object.keys(rules ?? {})),
  customError = buildCustomErrorRules(availableRules);
```

### After

```typescript
const availableRules = new Set(Object.keys(rules ?? {}));
const customError = buildCustomErrorRules(availableRules);
```

## Autofix Behavior

The rule auto-fixes only safe, standalone declarations.

The following cases are reported but not auto-fixed:

* declarations inside loop initializers

  ```typescript
  for (let i = 0, j = 0; i < 10; i++) {}
  ```
* declarations with inline comments between declarators
* complex exported declarations where splitting may affect formatting or comments

Manual refactoring is required in these cases to preserve intent and formatting.