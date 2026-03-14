# require-aaa-sections

Requires supported `it(...)` and `test(...)` blocks to include strict `// Arrange`, `// Act`, and `// Assert` comments.

## What it checks

- requires strict section names with exact casing
- disallows executable code before the first `// Arrange` comment
- requires a blank line immediately before `// Act` and `// Assert`
- autofixes missing section comments when the test body has at least three lines
- may insert combined comments such as `// Arrange & Act` when adjacent missing boundaries share the same insertion point

## Example

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