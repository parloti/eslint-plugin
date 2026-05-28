# `codeperfect/no-import-export-extensions`

## Summary

Disallow explicit file extensions in import and export module specifiers.

## Enabled by

- `architecture`
- `all`
- internal `codeperfect` plugin registry

## Why this rule exists

Extensionless module specifiers improve consistency across TypeScript and JavaScript outputs and reduce extension-specific churn.

## Rule Details

### What this rule checks

- `import ... from "..."`
- `export { ... } from "..."`
- `export * from "..."`

The rule reports module specifiers that end with one of:

- `.ts`
- `.tsx`
- `.js`
- `.jsx`
- `.mts`
- `.cts`
- `.mjs`
- `.cjs`

## Invalid

```typescript
import { A } from "./feature.js";
```

```typescript
export { A } from "./feature.ts";
```

## Valid

```typescript
import { A } from "./feature";
```

```typescript
export { A } from "./feature";
```

```typescript
import { readFileSync } from "node:fs";
```

## Notes

- This rule applies to all module specifiers.
- This rule does not enforce any specific path alias strategy.
