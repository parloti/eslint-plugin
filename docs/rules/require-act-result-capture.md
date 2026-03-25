# `codeperfect/require-act-result-capture`

## Summary

Require non-void Act expressions to capture their result in a named variable before the Assert phase.

## Enabled by

- `testing`
- internal `codeperfect` plugin registry

## Why this rule exists

Capturing Act results makes the observed value explicit and keeps the Assert phase focused on verification rather than execution. This improves readability, debuggability, and consistency across tests.

The rule allows intentional exceptions where capturing would add noise or reduce clarity.

## Rule Details

### What counts as an Act expression

Within the `// Act` section, the rule inspects:

- function calls
- method calls
- constructor calls (`new ...`)

### Required behavior

- If an Act expression returns a non-void value, it must be assigned to a variable
- The variable should represent the observed result (e.g. `actualResult`, `result`, `output`)

### Allowed patterns (exceptions)

The rule does **not** require capturing when:

#### 1. Combined Act & Assert

- The Act is embedded directly inside an assertion

```typescript
// Act & Assert
expect(run(input)).toBe(1);
```

#### 2. Void or side-effect-only interactions

* The call is clearly intended for side effects only
* The return value is unused and not meaningful

Examples:

* mutating inputs
* pushing to arrays
* calling listeners or callbacks

#### 3. Framework or listener setup patterns

* Common testing or lint-rule patterns where return values are not relevant

Examples:

* rule listeners (`create(...)`)
* event-style handlers
* registration APIs

### Disallowed patterns

* calling a non-void function in Act without capturing its result
* performing meaningful computation in Act that is only indirectly asserted

## Invalid

### Uncaptured non-void result

```typescript
it("captures act results", () => {
  // Arrange
  const input = 1;

  // Act
  run(input); // ❌ result is ignored

  // Assert
  expect(input).toBe(1);
});
```

### Hidden result usage in Assert

```typescript
it("uses result indirectly", () => {
  // Arrange
  const input = 1;

  // Act
  compute(input); // ❌ result not captured

  // Assert
  expect(input).toBe(2);
});
```

## Valid

### Captured result

```typescript
it("allows captured results", () => {
  // Arrange
  const input = 1;

  // Act
  const actualResult = run(input);

  // Assert
  expect(actualResult).toBe(1);
});
```

### Combined Act & Assert

```typescript
it("allows combined act and assert expectations", () => {
  // Arrange
  const input = 1;

  // Act & Assert
  expect(run(input)).toBe(1);
});
```

### Side-effect interaction

```typescript
it("allows helper-driven act interactions", () => {
  // Arrange
  const reports: unknown[] = [];
  const context = { report: (value: unknown) => reports.push(value) };
  const node = { type: "Identifier" };

  // Act
  runListener(context, node);

  // Assert
  expect(reports).toStrictEqual([]);
});
```

### Listener or factory patterns

```typescript
it("allows rule listener creation", () => {
  // Arrange
  const reportCalls: unknown[] = [];
  const customRule = { create: (context: unknown) => ({ context }) };
  const context = { report: (value: unknown) => reportCalls.push(value) };

  // Act
  customRule.create(context);

  // Assert
  expect(reportCalls).toStrictEqual([]);
});
```

### Explicit void interaction

```typescript
it("allows obvious void interactions", () => {
  // Arrange
  const input = 1;

  // Act
  setValue(input);

  // Assert
  expect(input).toBe(1);
});
```