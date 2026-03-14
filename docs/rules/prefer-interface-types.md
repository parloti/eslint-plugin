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

## Valid

```ts
interface UserInput {
  id: string;
  name: string;
}

function saveUser(user: UserInput) {}
```
