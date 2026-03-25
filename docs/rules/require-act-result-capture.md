# `codeperfect/require-act-result-capture`

## Summary

Require non-void Act expressions to capture the observed result in a named variable before assertions.

## Enabled by

- `testing`
- internal `codeperfect` plugin registry

## Why this rule exists

Capturing Act results makes the observed value explicit and keeps the Assert phase focused on checks. The rule allows common exceptions such as combined Act-and-Assert expectations and obviously void interactions.

## Invalid

```typescript
it("captures act results", () => {
  // Arrange
  const input = 1;

  // Act
  run(input);

  // Assert
  expect(input).toBe(1);
});
```

## Valid

```typescript
it("allows captured results", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Assert
  expect(actualResult).toBe(1);
});

it("allows combined act and assert expectations", () => {
  // Arrange
  const input = 1;

  // Act & Assert
  expect(run(input)).toBe(1);
});

it("allows helper-driven act interactions", () => {
  // Arrange
  const reports = [];
  const context = { report: (value) => reports.push(value) };
  const node = { type: "Identifier" };

  // Act
  runListener(context, node);

  // Assert
  expect(reports).toStrictEqual([]);
});

it("allows rule listener creation", () => {
  // Arrange
  const reportCalls = [];
  const customRule = { create: (context) => ({ context }) };
  const context = { report: (value) => reportCalls.push(value) };

  // Act
  customRule.create(context);

  // Assert
  expect(reportCalls).toStrictEqual([]);
});

it("allows obvious void interactions", () => {
  // Arrange
  const input = 1;

  // Act
  setValue(input);

  // Assert
  expect(input).toBe(1);
});
```