# enforce-aaa-structure

Requires AAA section comments to appear once and in Arrange, Act, Assert order.

## What it checks

- `// Arrange` must appear before `// Act`
- `// Act` must appear before `// Assert`
- duplicate section comments are rejected

## Example

```typescript
it("keeps a single AAA flow", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Assert
  expect(actualResult).toBe(1);
});
```