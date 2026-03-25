# `codeperfect/enforce-aaa-phase-purity`

## Summary

Enforce strict separation of Arrange, Act, and Assert phases by ensuring each phase contains only its intended responsibilities.

## Enabled by

- `testing`
- internal `codeperfect` plugin registry

## Why this rule exists

AAA comments are only useful when each section contains the correct type of work. Mixing setup, execution, and verification reduces readability and makes tests harder to reason about. This rule preserves clear intent by keeping each phase focused and predictable.

## Rule Details

The rule applies to tests that use explicit AAA comments:

- `// Arrange`
- `// Act`
- `// Assert`
- `// Arrange & Act`
- `// Act & Assert`
- `// Arrange & Act & Assert`

Combined sections allow merging responsibilities, but only those explicitly listed.

---

### Arrange

Allowed:
- test data setup
- variable declarations
- mocks, stubs, and test configuration

Disallowed:
- assertions (`expect`)
- mutations of values later used as expected results

---

### Act

Allowed:
- exactly one logical interaction with the system under test (SUT)
- `await` expressions
- capturing the result of the SUT

Disallowed:
- setup or configuration logic
- assertions (`expect`)
- unrelated utility calls not part of the SUT interaction

---

### Assert

Allowed:
- assertions (`expect`)
- reading values produced during Act

Disallowed:
- mutating variables defined in Arrange or Act
- re-running the SUT
- setup or configuration logic

---

## Combined Sections

### Arrange & Act

Allowed:
- all Arrange responsibilities
- a single SUT interaction (Act)

Disallowed:
- assertions

---

### Act & Assert

Allowed:
- a single SUT interaction
- inline assertions (e.g. `expect(run()).toBe(...)`)

Disallowed:
- setup or configuration logic
- mutations after assertion

---

### Arrange & Act & Assert

Allowed:
- setup
- a single SUT interaction
- assertions

Disallowed:
- multiple SUT interactions
- mutations after assertion
- unrelated side effects

---

## Invalid

```typescript
it("keeps async work out of arrange", async () => {
  // Arrange
  let expectedValue = 1;
  const actualResult = await run(); // ❌ async/SUT work in Arrange-only section

  // Act
  setupHarness(); // ❌ setup after Arrange

  // Assert
  expectedValue = 2; // ❌ mutation in Assert
  expect(actualResult).toBe(expectedValue);
});
```

```typescript
test("keeps assertions in assert", () => {
  // Arrange
  const expectedValue = 1;

  // Act
  expect(run()).toBe(expectedValue); // ❌ assertion in Act-only section

  // Assert
  const actualResult = 1;
  expect(actualResult).toBe(expectedValue);
});
```

```typescript
it("rejects multiple SUT interactions", () => {
  // Arrange & Act
  const input = 1;
  const a = run(input);
  const b = run(input); // ❌ multiple Act interactions

  // Assert
  expect(a).toBe(b);
});
```

```typescript
it("rejects setup in act & assert", () => {
  // Act & Assert
  initializeMocks(); // ❌ setup not allowed
  expect(run()).toBe(1);
});
```

---

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
```

```typescript
it("allows arrange and act together", () => {
  // Arrange & Act
  const input = 1;
  const actual = run(input);

  // Assert
  expect(actual).toBe(1);
});
```

```typescript
it("allows act and assert together", () => {
  // Arrange
  const input = 1;

  // Act & Assert
  expect(run(input)).toBe(1);
});
```

```typescript
it("allows full inline AAA", () => {
  // Arrange & Act & Assert
  const input = 1;
  expect(run(input)).toBe(1);
});
```