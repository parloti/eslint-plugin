# `codeperfect/prefer-interface-types`

## Summary

Prefer named interfaces or type aliases over inline object types in type positions.

## Enabled by

- `typescript`
- internal `codeperfect` plugin registry

## Why this rule exists

Named types improve readability, reuse, and documentation quality. Inline object shapes in signatures are harder to reference, extend, and evolve over time.

## Rule Details

- Inline object types are disallowed in:
  - function parameters
  - function return types
  - variable type annotations
- Instead, define a named:
  - `interface`, or
  - `type` alias

### Allowed

- Named interfaces or type aliases
- Inline object types in:
  - simple, local, or one-off cases (see below)
  - generic constraints
  - mapped or utility types

### Exceptions

Inline object types are allowed when:

- the type is trivial and unlikely to be reused
  ```typescript
  const point: { x: number } = { x: 1 };
```

* used in generic constraints

  ```typescript
  function process<T extends { id: string }>(input: T): T {
    return input;
  }
  ```

* used with utility or mapped types

  ```typescript
  type PartialUser = Partial<{ id: string; name: string }>;
  ```

## Invalid

```typescript
function saveUser(user: { id: string; name: string }) {}
```

```typescript
function demo(input: { value: string }): { value: string } {
  return input;
}
```

```typescript
const handler: (input: { value: string }) => void = () => {};
```

## Valid

### Using interfaces

```typescript
interface UserInput {
  id: string;
  name: string;
}

function saveUser(user: UserInput) {}
```

```typescript
interface DemoInput {
  value: string;
}

function demo(input: DemoInput): DemoInput {
  return input;
}
```

### Using type aliases

```typescript
type DemoInput = { value: string };

const demo = (...values: DemoInput[]): DemoInput => values[0]!;
```

```typescript
type SaveUserInput = {
  id: string;
  name: string;
};

function saveUser(user: SaveUserInput): void {}
```

### Allowed inline cases

```typescript
// trivial, local usage
const point: { x: number } = { x: 1 };
```

```typescript
// generic constraint
function process<T extends { id: string }>(input: T): T {
  return input;
}
```

```typescript
// utility type
type PartialUser = Partial<{ id: string; name: string }>;
```
