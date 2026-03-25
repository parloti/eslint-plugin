# `codeperfect/single-line-jsdoc`

## Summary

Require JSDoc comments to use a single-line format when their content fits on one line.

## Enabled by

- `jsdoc`
- internal `codeperfect` plugin registry

## Why this rule exists

Short documentation should remain compact and easy to scan. Single-line JSDoc:

- reduces vertical noise
- improves readability for simple descriptions
- keeps formatting consistent across codebases

## Rule Details

### What the rule targets

- JSDoc block comments (`/** ... */`)

### When a single-line format is required

A JSDoc comment must be converted to a single line when:

- it contains only plain text (no tags)
- it fits within the configured maximum line length
- it does not contain line breaks that are semantically meaningful

### Disallowed patterns

- multi-line JSDoc with a single short description
- unnecessary line breaks in simple comments

### Allowed patterns

The rule does **not** enforce single-line format when:

- the comment contains JSDoc tags (`@param`, `@returns`, `@example`, etc.)
- the content exceeds the configured line length
- the comment includes multiple logical lines or paragraphs
- formatting would reduce clarity

### Autofix behavior

The autofix:

- collapses eligible multi-line JSDoc into a single line
- preserves the original text content
- trims leading `*` and indentation
- respects line length limits

The autofix does **not** apply when:

- tags are present
- content would exceed the maximum line length
- formatting ambiguity exists

## Invalid

### Simple multi-line description

```typescript
/**
 * Returns the value.
 */
```

### Unnecessary multi-line comment

```typescript
/**
 * doc
 */
const value = 1;
```

## Autofix

### Before

```typescript
/**
 * doc
 */
const value = 1;
```

### After

```typescript
/** doc */
const value = 1;
```

## Valid

### Proper single-line JSDoc

```typescript
/** Returns the value. */
```

```typescript
/** doc */
const value = 1;
```

### Multi-line with tags

```typescript
/**
 * @param value Input value.
 */
function demo(value: string): string {
  return value;
}
```

### Multi-line due to length

```typescript
/**
 * Returns a very long description that would exceed the configured maximum line length if written on a single line.
 */
```