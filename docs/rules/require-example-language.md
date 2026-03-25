# `codeperfect/require-example-language`

## Summary

Require `@example` tags to use fenced code blocks with a language.

## Enabled by

- `jsdoc`
- internal `codeperfect` plugin registry

## Why this rule exists

Language-tagged examples render better in editors and documentation tooling, and they make example blocks unambiguous for readers.

## Invalid

```ts
/**
 * @example
 * ```
 * value();
 * ```
 */
```

```ts
/**
 * @example const value = 1;
 */
export function demo(): void {}
```

## Autofix examples

Before:

```ts
/**
 * @example const value = 1;
 */
export function demo(): void {}
```

After:

```ts
/**
 * @example
 * ```typescript
 *  const value = 1;
 * ```
 */
export function demo(): void {}
```

Before:

```ts
/**
 * @example
 * ```
 * const value = 1;
 * ```
 */
export function demo(): void {}
```

After:

```ts
/**
 * @example
 * ```typescript
 * const value = 1;
 * ```
 */
export function demo(): void {}
```

## Valid

```ts
/**
 * @example
 * ```typescript
 * value();
 * ```
 */
```

```ts
/**
 * @example
 * ```typescript
 * const value = 1;
 * ```
 */
export function demo(): void {}
```
