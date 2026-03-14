# assert-actual-expected-names

Requires Assert-local comparison values to use `actual*` and `expected*` prefixes when they participate in assertions.

## Example

```typescript
it("uses explicit assert names", () => {
  // Arrange
  const input = 1;

  // Act
  const computedResult = run(input);

  // Assert
  const actualResult = computedResult;
  const expectedValue = 1;
  expect(actualResult).toBe(expectedValue);
});
```