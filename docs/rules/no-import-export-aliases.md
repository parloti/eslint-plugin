# `codeperfect/no-import-export-aliases`

## Summary

Disallow aliased named imports and exports such as `A as B`, except when the original name is already bound in the same file.

## Enabled by

- `architecture`
- `all`
- internal `codeperfect` plugin registry

## Why this rule exists

Avoiding unnecessary aliases keeps module boundaries readable and prevents avoidable naming indirection.

## Rule Details

### What this rule checks

- named import specifiers with aliasing
- named export specifiers with aliasing

### Allowed exception

Aliasing is allowed when the original name is already bound in the same file. This covers collision-avoidance scenarios.

## Invalid

```typescript
import { A as B } from "./feature";
```

## Valid

```typescript
import { A } from "./one";
import { A as B } from "./two";
```

```typescript
import { A } from "./feature";
export { A as B };
```

```typescript
import { A } from "./feature";
export { A };
```

## Notes

- This rule does not rewrite identifiers automatically.
- This rule does not enforce naming style beyond alias usage.
