# `codeperfect/require-example-language`

## Summary

Require `@example` JSDoc tags to use fenced code blocks with an explicit language.

## Enabled by

- `jsdoc`
- internal `codeperfect` plugin registry

## Why this rule exists

Language-tagged code fences:

- improve syntax highlighting in editors and documentation tools
- remove ambiguity about the example’s intent
- enforce consistent documentation structure across codebases

## Rule Details

### What the rule targets

The rule inspects all `@example` JSDoc tags.

### Required format

Each `@example` must:

- use a fenced code block (triple backticks)
- include a language identifier (e.g. `typescript`, `ts`, `js`)
- place all example code inside the fence

### Disallowed patterns

- code fences without a language
- inline `@example` code (non-fenced)
- partially fenced examples (code both inside and outside fences)

### Allowed variations

- any valid language identifier is accepted (`ts`, `typescript`, `js`, etc.)
- empty lines inside fences are allowed
- multiple `@example` tags per block are allowed (each must comply)

## Invalid

### Missing language in fence

```typescript
 /**
  * @example
  * ```
  * value();
  * ```
  */
```

### Inline example (not fenced)

```typescript
 /**
  * @example const value = 1;
  */
export function demo(): void {}
```

### Mixed fenced and inline content

```typescript
 /**
  * @example
  * const value = 1;
  * ```typescript
  * value();
  * ```
  */
```

## Autofix

The autofix:

* wraps inline examples in a fenced block
* adds a default language (`typescript`) when missing
* preserves existing code content and indentation where possible

### Before

```typescript
 /**
  * @example const value = 1;
  */
export function demo(): void {}
```

### After

```typescript
 /**
  * @example
  * ```typescript
  * const value = 1;
  * ```
  */
export function demo(): void {}
```

### Before

```typescript
 /**
  * @example
  * ```
  * const value = 1;
  * ```
  */
export function demo(): void {}
```

### After

```typescript
 /**
  * @example
  * ```typescript
  * const value = 1;
  * ```
  */
export function demo(): void {}
```

## Valid

### Proper fenced example with language

```typescript
 /**
  * @example
  * ```typescript
  * value();
  * ```
  */
```

### Export with valid example

```typescript
 /**
  * @example
  * ```typescript
  * const value = 1;
  * ```
  */
export function demo(): void {}
```

### Multiple examples

```typescript
 /**
  * @example
  * ```typescript
  * value();
  * ```
  *
  * @example
  * ```typescript
  * otherValue();
  * ```
  */
```