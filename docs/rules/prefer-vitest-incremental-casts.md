# `codeperfect/prefer-vitest-incremental-casts`

## Summary

Normalize `vi.mock(...)` and `vi.doMock(...)` factories when TypeScript rejects the returned module object, replacing broad or failed casting attempts with the smallest stable nested casts needed for the mocked module shape.

## Enabled by

- `vitest`
- internal `codeperfect` plugin registry

## Why this rule exists

Vitest module factories often hit TypeScript overload errors when the returned object is only a partial structural match for the mocked module. A broad top-level cast is often not enough because TypeScript still rejects incompatible nested members. This rule rewrites the factory into a canonical incremental-cast form:

- only mismatching properties receive nested casts
- already assignable properties stay untouched
- previous broad or partial casting attempts are removed
- unsupported spread-heavy objects are skipped instead of guessed at

## Invalid

```typescript
const disableTypeChecked = { rules: [] as string[] };
const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };
const plugin = { meta: { name: "fixture" } };

vi.doMock(import("fixture-module"), () => ({
  configs: { disableTypeChecked } as Record<string, unknown>,
  parser: parser as unknown as typeof import("fixture-module")["parser"],
  plugin,
} as unknown as typeof import("fixture-module")));

const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };

vi.mock(import("fixture-module"), () => ({
  parser: parser as unknown as typeof import("fixture-module")["parser"],
} as unknown as typeof import("fixture-module")));
```

## Autofix example

Before:

```typescript
const disableTypeChecked = { rules: [] as string[] };
const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };
const plugin = { meta: { name: "fixture" } };

vi.doMock(import("fixture-module"), () => ({
  configs: { disableTypeChecked } as Record<string, unknown>,
  parser: parser as unknown as typeof import("fixture-module")["parser"],
  plugin,
} as unknown as typeof import("fixture-module")));
```

After:

```typescript
const disableTypeChecked = { rules: [] as string[] };
const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };
const plugin = { meta: { name: "fixture" } };

vi.doMock(import("fixture-module"), () => (({
  configs: { disableTypeChecked } as typeof import("fixture-module")["configs"],
  parser,
  plugin,
})));
```

## Valid

```typescript
const disableTypeChecked = { rules: [] as string[] };
const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };
const plugin = { meta: { name: "fixture" } };

vi.doMock(import("fixture-module"), () => ({
  configs: { disableTypeChecked } as typeof import("fixture-module")["configs"],
  parser,
  plugin,
}));

const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };

vi.mock(import("fixture-module"), () => ({
  parser,
}));
```
