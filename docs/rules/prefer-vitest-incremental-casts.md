# `codeperfect/prefer-vitest-incremental-casts`

## Summary

Prefer minimal, property-level casts in `vi.mock(...)` and `vi.doMock(...)` factories instead of broad or layered top-level casts.

## Enabled by

- `vitest`
- internal `codeperfect` plugin registry

## Why this rule exists

Vitest module factories frequently hit TypeScript overload errors when the returned object only partially matches the mocked module’s shape. A common workaround is to apply a broad top-level cast (often via `as unknown as typeof import(...)`), but this:

- hides which properties are actually incompatible
- makes the mock harder to reason about
- often still fails when nested properties are incompatible

This rule normalizes mock factories into a **canonical incremental-cast form**:

- only incompatible properties receive casts
- compatible properties remain untouched
- redundant or layered casts are removed
- complex or unsafe cases are skipped rather than guessed

## Rule Details

### What the rule targets

The rule inspects factories passed to:

- `vi.mock(...)`
- `vi.doMock(...)`

when the factory returns an object literal.

### Disallowed patterns

- top-level casts on the returned object
  - e.g. `(...) as typeof import("x")`
- layered casts
  - e.g. `as unknown as typeof import("x")`
- casting an entire property when only a nested member mismatches
- mixing incremental casts with a final broad cast

### Required form

- the returned object must be uncast
- individual properties may be cast to:
  - `typeof import("module")["property"]`
- properties that already satisfy the type must not be cast

### Skipped cases (no report, no autofix)

- object literals using spreads
- factories returning non-object expressions
- dynamic property keys
- conditional or computed factory logic

## Invalid

### Broad and layered top-level casts

```typescript
const disableTypeChecked = { rules: [] as string[] };
const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };
const plugin = { meta: { name: "fixture" } };

vi.doMock(import("fixture"), () => ({
  configs: { disableTypeChecked } as Record<string, unknown>,
  parser: parser as unknown as typeof import("fixture")["parser"],
  plugin,
} as unknown as typeof import("fixture")));
```

### Redundant casting when a property is already assignable

```typescript
const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };

vi.mock(import("fixture"), () => ({
  parser: parser as unknown as typeof import("fixture")["parser"],
} as unknown as typeof import("fixture")));
```

## Autofix

The autofix rewrites the factory into incremental form by:

* removing top-level casts
* preserving only the minimal property-level casts required
* leaving assignable properties unchanged

### Before

```typescript
const disableTypeChecked = { rules: [] as string[] };
const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };
const plugin = { meta: { name: "fixture" } };

vi.doMock(import("fixture"), () => ({
  configs: { disableTypeChecked } as Record<string, unknown>,
  parser: parser as unknown as typeof import("fixture")["parser"],
  plugin,
} as unknown as typeof import("fixture")));
```

### After

```typescript
const disableTypeChecked = { rules: [] as string[] };
const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };
const plugin = { meta: { name: "fixture" } };

vi.doMock(import("fixture"), () => ({
  configs: { disableTypeChecked } as typeof import("fixture")["configs"],
  parser,
  plugin,
}));
```

## Valid

### Incremental property-level casts

```typescript
const disableTypeChecked = { rules: [] as string[] };
const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };
const plugin = { meta: { name: "fixture" } };

vi.doMock(import("fixture"), () => ({
  configs: { disableTypeChecked } as typeof import("fixture")["configs"],
  parser,
  plugin,
}));
```

### No casts needed

```typescript
const parser = { parseForESLint: (_code: string) => ({ ast: "ok" }) };

vi.mock(import("fixture"), () => ({
  parser,
}));
```