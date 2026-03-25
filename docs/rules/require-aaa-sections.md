# `codeperfect/require-aaa-sections`

## Summary

Require supported `it(...)` and `test(...)` blocks to include strict `// Arrange`, `// Act`, and `// Assert` comments.

## Enabled by

- `testing`
- internal `codeperfect` plugin registry

## Why this rule exists

Strict section comments give tests a predictable structure and make AAA-based companion rules possible. The rule also enforces spacing so phase boundaries stay visually obvious.

## What it checks

- requires strict section names with exact casing
- disallows executable code before the first `// Arrange` comment
- requires a blank line immediately before `// Act` and `// Assert`
- autofixes missing section comments when the test body has at least three lines
- may insert combined comments such as `// Arrange & Act` when adjacent missing boundaries share the same insertion point

## Invalid

```typescript
it("captures the result", () => {
  const input = 1;
  const actualResult = run(input);
  expect(actualResult).toBe(1);
});

it("separates phases", () => {
  // Arrange
  const input = 1;
  // Act
  const actualResult = run(input);
  // Assert
  expect(actualResult).toBe(1);
});

it("starts with arrange", () => {
  const input = 1;
  // Arrange
  const actualResult = run(input);

  // Act
  const nextResult = rerun(actualResult);

  // Assert
  expect(nextResult).toBe(2);
});
```

## Autofix examples

Before:

```typescript
it("captures the result", () => {
  const input = 1;
  const actualResult = run(input);
  expect(actualResult).toBe(1);
});
```

After:

```typescript
it("captures the result", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Assert
  expect(actualResult).toBe(1);
});
```

Before:

```typescript
it("separates phases", () => {
  // Arrange
  const input = 1;
  // Act
  const actualResult = run(input);
  // Assert
  expect(actualResult).toBe(1);
});
```

After:

```typescript
it("separates phases", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Assert
  expect(actualResult).toBe(1);
});
```

## Valid

```typescript
test("uses AAA comments", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Assert
  expect(actualResult).toBe(1);
});

it("accepts combined AAA comments", () => {
  // Arrange & Act & Assert
  expect(run()).toBe(1);
});
```