# `codeperfect/no-interface-member-docs`

## Summary

Disallow documenting members of parameters typed with named interfaces or type aliases using nested `@param` tags.

## Enabled by

- `jsdoc`
- internal `codeperfect` plugin registry

## Why this rule exists

When a parameter uses a named interface or type alias, documenting its members with nested `@param` tags (e.g. `@param context.value`) duplicates structure that should live on the type definition itself. This creates drift and splits documentation across multiple locations.

Inline object types are the exception, since their structure is defined at the function boundary.

## Rule Details

- Disallowed:
  - Nested `@param` tags for parameters typed with:
    - interfaces
    - type aliases
- Allowed:
  - A single top-level `@param` for the parameter itself
  - Nested `@param` tags when the parameter uses an inline object type
- The rule applies only to dot-notation param tags:
  - e.g. `@param context.value`

## Invalid

```typescript
/**
 * @param context The metadata context.
 * @param context.commentValue The full comment value. // ❌ nested param on typed object
 */
function getLineMeta(context: LineMetaContext): void {}
```

```typescript
/**
 * @param options Configuration.
 * @param options.retryCount Number of retries. // ❌ duplicate structure
 */
function run(options: RunOptions): void {}
```

## Autofix

Removes nested `@param` entries for typed object members.

### Before

```typescript
/**
 * @param context The metadata context.
 * @param context.commentValue The full comment value.
 */
function getLineMeta(context: LineMetaContext): void {}
```

### After

```typescript
/**
 * @param context The metadata context.
 */
function getLineMeta(context: LineMetaContext): void {}
```

## Valid

### Named type without nested docs

```typescript
/**
 * @param context The metadata context.
 */
function getLineMeta(context: LineMetaContext): void {}
```

### Inline object type (nested docs allowed)

```typescript
/**
 * @param context The metadata context.
 * @param context.commentValue The full comment value.
 */
function getLineMeta(context: { commentValue: string }): void {}
```

### Multiple parameters with correct usage

```typescript
/**
 * @param context The metadata context.
 * @param options Inline options.
 * @param options.retryCount Number of retries.
 */
function run(
  context: LineMetaContext,
  options: { retryCount: number }
): void {}
```