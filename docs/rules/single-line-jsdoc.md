# `codeperfect/single-line-jsdoc`

## Summary

Require JSDoc comments to use a single line when they fit.

## Enabled by

- `jsdoc`
- internal `codeperfect` plugin registry

## Why this rule exists

Short documentation should stay compact. Single-line JSDoc improves readability when the content fits within the configured line length.

## Invalid

```ts
/**
 * Returns the value.
 */
```

## Valid

```ts
/** Returns the value. */
```
