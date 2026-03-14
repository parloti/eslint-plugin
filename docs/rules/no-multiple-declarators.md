# `codeperfect/no-multiple-declarators`

## Summary

Require one variable declarator per declaration statement.

## Enabled by

- `core`
- internal `codeperfect` plugin registry

## Why this rule exists

Splitting declarations makes diffs smaller, simplifies reordering, and prevents unrelated variables from sharing a single statement.

## Invalid

```ts
const availableRules = new Set(Object.keys(rules ?? {})),
  customError = buildCustomErrorRules(availableRules);
```

## Valid

```ts
const availableRules = new Set(Object.keys(rules ?? {}));
const customError = buildCustomErrorRules(availableRules);
```

## Autofix behavior

The rule auto-fixes straightforward standalone declarations. It still reports risky cases such as loop initializers, exported declarations, or separators that contain comments, but leaves those for manual cleanup.