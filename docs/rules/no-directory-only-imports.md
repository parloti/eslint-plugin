# `codeperfect/no-directory-only-imports`

## Summary

Disallow relative module specifiers made only from `.` and `..` path segments.

## Enabled by

- `architecture`
- `all`
- internal `codeperfect` plugin registry

## Why this rule exists

Importing a directory through its index file can create hidden dependencies on a barrel and introduce cycles. Naming the target module directly makes the dependency explicit.

## Rule Details

The rule checks static imports, re-exports, TypeScript import types, and literal dynamic imports. It reports relative specifiers whose path consists only of `.` and `..` segments, allowing an optional query or fragment suffix.

## Invalid

```typescript
import { value } from ".";
```

```typescript
import { value } from "..";
```

```typescript
import { value } from "./..";
```

```typescript
const module = await import(".././..");
```

```typescript
const module = await import(`..`);
```

```typescript
type Shape = import(".").Shape;
```

```typescript
import { value } from ".\\..";
```

## Valid

```typescript
import { value } from "./value";
```

```typescript
import { value } from "../domain/value";
```

```typescript
import { value } from "./.../value";
```

The last example names a directory literally called `...`; it is not a `.` or `..` path segment.

## Notes

- The rule does not resolve paths or infer whether a named module itself re-exports from a barrel.
- Computed dynamic imports are not analyzed.
- Backslashes are treated as path separators.
- CommonJS `require()` calls and TypeScript `import = require(...)` declarations are outside the rule's scope.
