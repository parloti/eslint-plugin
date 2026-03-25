# `codeperfect/prefer-interface-types`

## Summary

Prefer named interfaces or aliases over inline object types.

## Enabled by

- `typescript`
- internal `codeperfect` plugin registry

## Why this rule exists

Named types improve readability, reuse, and documentation quality. Inline object shapes in signatures are harder to reference and evolve.

## Invalid

```ts
function saveUser(user: { id: string; name: string }) {}
```

```ts
function demo(input: { value: string }): { value: string } {
  return input;
}
```

## Valid

```ts
interface UserInput {
  id: string;
  name: string;
}

function saveUser(user: UserInput) {}
```

```ts
interface DemoInput {
  value: string;
}

function demo(input: DemoInput): DemoInput {
  return input;
}
```

```ts
type DemoInput = { value: string };

const demo = (...values: DemoInput[]): DemoInput => values[0]!;
```

```ts
type SaveUserInput = {
  id: string;
  name: string;
};

function saveUser(user: SaveUserInput): void {}
```
