# `codeperfect/no-interface-member-docs`

## Summary

Disallow documenting members of typed object parameters with nested `@param` tags.

## Enabled by

- `jsdoc`
- internal `codeperfect` plugin registry

## Why this rule exists

When a parameter already uses a named interface or type alias, nested `@param` tags such as `@param context.value` duplicate structure that belongs on the type definition instead. Inline object types are the exception because the structure lives at the call site.

## Invalid

```ts
/**
 * @param context The metadata context.
 * @param context.commentValue The full comment value.
 */
function getLineMeta(context: LineMetaContext): void {}
```

## Autofix example

Before:

```ts
/**
 * @param context The metadata context.
 * @param context.commentValue The full comment value.
 */
function getLineMeta(context: LineMetaContext): void {}
```

After:

```ts
/**
 * @param context The metadata context.
 */
function getLineMeta(context: LineMetaContext): void {}
```

## Valid

```ts
/**
 * @param context The metadata context.
 */
function getLineMeta(context: { commentValue: string }): void {}
```

```ts
/**
 * @param context The metadata context.
 */
function getLineMeta(context: LineMetaContext): void {}
```
