# `codeperfect/single-act-statement`

## Summary

Require the `// Act` phase to contain exactly one top-level statement.

## Enabled by

- `testing`
- internal `codeperfect` plugin registry

## Why this rule exists

The Act phase should represent a single interaction with the system under test. Multiple top-level statements often indicate:

- hidden setup leaking from Arrange
- follow-up work that belongs after the Act
- multiple behaviors being tested at once

Keeping Act to one statement enforces clarity and intent.

## Rule Details

### What counts as a statement

Within the `// Act` section, the rule considers **top-level statements only**, including:

- expression statements (e.g. `run(input)`)
- variable declarations (e.g. `const result = run(input)`)

### Required behavior

- The Act phase must contain **exactly one top-level statement**
- That statement represents the primary interaction under test

### Allowed patterns

- nested logic inside the single statement (e.g. inline function calls)
- a single variable declaration capturing the result
- a single expression statement for side-effect interactions

### Disallowed patterns

- multiple top-level statements in Act
- splitting a single interaction across multiple statements
- performing follow-up work after the main Act statement

### Non-goals

- This rule does not enforce:
  - result capture (handled by `require-act-result-capture`)
  - AAA structure or presence (handled by `require-aaa-sections`)
  - phase purity (handled by `enforce-aaa-phase-purity`)

## Invalid

### Multiple top-level statements

```typescript
it("keeps one act statement", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);
  cleanup(actualResult); // ❌ second statement

  // Assert
  expect(actualResult).toBe(1);
});
```

### Split interaction

```typescript
it("splits the act across steps", () => {
  // Arrange
  const input = 1;

  // Act
  const intermediate = prepare(input);
  const actualResult = run(intermediate); // ❌ multiple steps in Act

  // Assert
  expect(actualResult).toBe(1);
});
```

## Valid

### Single declaration

```typescript
it("allows one act declaration", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Assert
  expect(actualResult).toBe(1);
});
```

### Single expression

```typescript
it("allows one act expression", () => {
  // Arrange
  const input = 1;

  // Act
  run(input);

  // Assert
  expect(input).toBe(1);
});
```

### Nested interaction within one statement

```typescript
it("allows nested calls in a single statement", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(prepare(input));

  // Assert
  expect(actualResult).toBe(1);
});
```