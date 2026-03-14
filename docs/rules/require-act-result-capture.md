# require-act-result-capture

Requires non-void Act expressions to capture the observed result in a named variable before assertions.

## Example

```typescript
it("captures the act result", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Assert
  expect(actualResult).toBe(1);
});
```