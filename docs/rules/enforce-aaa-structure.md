# `codeperfect/enforce-aaa-structure`

## Summary

Require AAA section comments to appear once and in Arrange, Act, Assert order.

## Enabled by

- `testing`
- internal `codeperfect` plugin registry

## Why this rule exists

AAA tests are easier to follow when the sections appear once and in a predictable order. Reordered or duplicated phase markers make test flow ambiguous.

## What it checks

- `// Arrange` must appear before `// Act`
- `// Act` must appear before `// Assert`
- duplicate section comments are rejected

## Invalid

```typescript
it("orders AAA phases", () => {
  // Act
  const actualResult = run();

  // Arrange
  const input = 1;

  // Assert
  expect(actualResult).toBe(input);
});

it("avoids duplicate act sections", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Act
  const nextResult = rerun(actualResult);

  // Assert
  expect(nextResult).toBe(2);
});
```

## Valid

```typescript
it.only("keeps a single AAA flow", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Assert
  expect(actualResult).toBe(1);
});
```