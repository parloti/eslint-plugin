# enforce-aaa-phase-purity

Keeps setup, action, and assertions inside their intended AAA phase.

## What it checks

- Arrange stays setup-only
- assertions stay in Assert
- `await` stays in Act
- async behavior is rejected in Arrange
- setup-style code after `// Act` is rejected
- Assert cannot mutate test data after Act
- Act must include a meaningful SUT interaction rather than only utility calls

## Example

```typescript
it("keeps phases pure", async () => {
  // Arrange
  const input = 1;
  const expectedValue = 2;

  // Act
  const actualResult = await run(input);

  // Assert
  expect(actualResult).toBe(expectedValue);
});
```