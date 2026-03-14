# single-act-statement

Requires the `// Act` phase to contain a single top-level expression statement or variable declaration.

## Example

```typescript
it("uses one act statement", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Assert
  expect(actualResult).toBe(1);
});
```