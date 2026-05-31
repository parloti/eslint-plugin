# `codeperfect/no-unsafe-vitest-mock-factory-cast`

## Summary

Disallow casted factory results in `vi.mock(...)` and `vi.doMock(...)`. Prefer `createMockProxy(...)` with a type-only module import so partial mocks fail loudly when a non-mocked property is accessed.

## Enabled by

- `vitest`
- internal `codeperfect` plugin registry

## Why this rule exists

Casting a mock factory result can hide an incomplete or incompatible mock. That is dangerous because the test may compile while silently relying on properties that were never mocked.

`createMockProxy(...)` makes the failure explicit: if code reads an unmocked property, the proxy throws a clear error instead of letting the test continue with bad assumptions.

## Rule Details

This rule flags `vi.mock(...)` and `vi.doMock(...)` calls when the second argument returns a casted mock value, such as:

- `({ prop: value } as Type)`
- `(({ prop: value } as unknown) as Type)`
- `({ prop: value } as unknown as Type)`

## Invalid

```typescript
vi.mock("./path/to/file", () => ({ prop: value }) as Type);
```

```typescript
vi.doMock(import("./path/to/file"), () => ({ prop: value }) as unknown as Type);
```

## Autofix

The autofix:

- unwraps the casted factory result
- replaces the factory with `createMockProxy<typeof ModuleName>(...)`
- adds `import type * as ModuleName from "..."` when needed

Autofix is applied only when replacing the factory is behavior-preserving:

- non-async factory
- no factory parameters
- expression-bodied return, or block body with exactly one `return` statement

The rule still reports unsafe casted factories outside this shape, but leaves them for manual refactoring.

### Before

```typescript
vi.mock("./path/to/file", () => ({ prop: value }) as Type);
```

### After

```typescript
import type * as FileModule from "./path/to/file";

vi.mock("./path/to/file", createMockProxy<typeof FileModule>({ prop: value }));
```

## Valid

### Uncasted factory

```typescript
vi.mock("./path/to/file", () => ({ prop: value }));
```

### Existing type import reused

```typescript
import type * as FileModule from "./path/to/file";

vi.doMock(
  import("./path/to/file"),
  createMockProxy<typeof FileModule>({ prop: value }),
);
```
