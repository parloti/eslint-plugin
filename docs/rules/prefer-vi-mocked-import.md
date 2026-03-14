# `codeperfect/prefer-vi-mocked-import`

## Summary

Inline local Vitest mocks and prefer `vi.mocked(...)` call sites.

## Enabled by

- `vitest`
- internal `codeperfect` plugin registry

## Why this rule exists

Vitest mock declarations are easier to follow when the factory owns the mock setup and later call sites use `vi.mocked(...)` consistently.

## Invalid

```ts
const mockedClient = vi.fn();
vi.mock("./client", () => ({ client: mockedClient }));
```

## Valid

```ts
vi.mock("./client", () => ({ client: vi.fn() }));
```
