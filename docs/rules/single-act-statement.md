# `codeperfect/single-act-statement`

## Summary

Require the `// Act` phase to contain a single top-level expression statement or variable declaration.

## Enabled by

- `testing`
- internal `codeperfect` plugin registry

## Why this rule exists

The Act phase should describe one interaction with the system under test. Multiple top-level Act statements usually hide additional setup or follow-up work that belongs in another phase.

## Invalid

```typescript
it("keeps one act statement", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);
  cleanup(actualResult);

  // Assert
  expect(actualResult).toBe(1);
});
```

## Valid

```typescript
it("allows one act declaration", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Assert
  expect(actualResult).toBe(1);
});

it("allows one act expression", () => {
  // Arrange
  const input = 1;

  // Act
  run(input);

  // Assert
  expect(input).toBe(1);
});
```