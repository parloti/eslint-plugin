# `codeperfect/assert-actual-expected-names`

## Summary

Require values used in assertions to follow `actual*` and `expected*` naming conventions (including the short forms `actual` and `expected`).

## Enabled by

* `testing`
* internal `codeperfect` plugin registry

## Why this rule exists

Tests read more clearly when the compared values advertise their role directly. In assertions, names like `result` and `value` hide intent, while `actualResult` and `expectedValue` make the comparison obvious at a glance.

## Rule Details

* Values passed to `expect()` should be named with:

  * `actual*` (or `actual`)
* Values passed as matcher arguments should be named with:

  * `expected*` (or `expected`)
* Variables may be declared in either the Act or Assert phase
* Neutral names (e.g. `computedResult`) are allowed before assertion, but must not be used directly in `expect`
* The rule applies to all matcher types (e.g. `toBe`, `toEqual`, `toStrictEqual`, etc.)

## Invalid

```typescript
it("rejects generic names in assert", () => {
  // Arrange
  const input = 1;

  // Act
  const result = run(input);

  // Assert
  const value = 1;
  expect(result).toBe(value);
});

it("requires expected prefix", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Assert
  const value = 1;
  expect(actualResult).toBe(value);
});

it("requires actual prefix", () => {
  // Arrange
  const input = 1;

  // Act
  const result = run(input);

  // Assert
  const expectedValue = 1;
  expect(result).toBe(expectedValue);
});

it("disallows inline assertion values", () => {
  // Arrange
  const input = 1;

  // Act & Assert
  expect(run(input)).toBe(1);
});
```

## Valid

```typescript
it("uses actual and expected prefixes", () => {
  // Arrange
  const input = 1;

  // Act
  const computedResult = run(input);

  // Assert
  const actualResult = computedResult;
  const expectedValue = 1;
  expect(actualResult).toBe(expectedValue);
});

it("allows the short actual and expected names", () => {
  // Arrange
  const input = 1;

  // Act
  const computedResult = run(input);

  // Assert
  const actual = computedResult;
  const expected = 1;
  expect(actual).toBe(expected);
});

it("allows actual to be introduced during Act", () => {
  // Arrange
  const input = 1;

  // Act
  const actual = run(input);

  // Assert
  const expected = 1;
  expect(actual).toBe(expected);
});

it("keeps descriptive prefixes for matcher arguments", () => {
  // Arrange
  const input = 2;

  // Act
  const computedTotal = run(input);

  // Assert
  const actualTotal = computedTotal;
  const expectedTotal = 2;
  expect(actualTotal).toBe(expectedTotal);
});

it("supports multiple assertions", () => {
  // Arrange
  const input = 2;

  // Act
  const computed = run(input);

  // Assert
  const actualA = computed;
  const expectedA = 2;
  const actualB = computed * 2;
  const expectedB = 4;

  expect(actualA).toBe(expectedA);
  expect(actualB).toBe(expectedB);
});

it("supports other matcher types", () => {
  // Arrange
  const input = { count: 1 };

  // Act
  const actual = run(input);

  // Assert
  const expected = { count: 1 };
  expect(actual).toEqual(expected);
});

it("supports negative assertions", () => {
  // Arrange
  const input = 1;

  // Act
  const actual = run(input);

  // Assert
  const expected = 2;
  expect(actual).not.toBe(expected);
});
```