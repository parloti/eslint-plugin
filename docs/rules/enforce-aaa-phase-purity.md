# `codeperfect/enforce-aaa-phase-purity`

## Summary

Keep setup, action, and assertions inside their intended AAA phase.

## Enabled by

- `testing`
- internal `codeperfect` plugin registry

## Why this rule exists

AAA comments only help when each section contains the right kind of work. This rule keeps setup in Arrange, system interaction in Act, and checks in Assert so test intent stays explicit.

## What it checks

- Arrange stays setup-only
- assertions stay in Assert
- `await` stays in Act
- async behavior is rejected in Arrange
- setup-style code after `// Act` is rejected
- Assert cannot mutate test data after Act
- Act must include a meaningful SUT interaction rather than only utility calls

## Invalid

```typescript
it("keeps async work out of arrange", async () => {
  // Arrange
  let expectedValue = 1;
  const actualResult = await run();

  // Act
  setupHarness();

  // Assert
  expectedValue = 2;
  expect(actualResult).toBe(expectedValue);
});

test("keeps assertions in assert", () => {
  // Arrange
  const expectedValue = 1;

  // Act
  expect(run()).toBe(expectedValue);

  // Assert
  const actualResult = 1;
  expect(actualResult).toBe(expectedValue);
});
```

## Valid

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

it("allows combined act and assert markers", () => {
  // Arrange
  const input = 1;

  // Act & Assert
  expect(run(input)).toBe(1);
});

it("keeps setup work before act helpers run", () => {
  // Arrange
  const input = 1;
  const expectedValue = 1;

  // Act
  const actualResult = run(input);

  // Assert
  expect(actualResult).toBe(expectedValue);
});
```