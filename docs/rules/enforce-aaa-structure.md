# `codeperfect/enforce-aaa-structure`

## Summary

Require AAA section comments to appear at most once and in a valid order, including support for combined phase comments.

## Enabled by

- `testing`
- internal `codeperfect` plugin registry

## Why this rule exists

AAA tests are easier to follow when each phase appears once and in a predictable order. Reordered, duplicated, or partially overlapping phase markers make test flow ambiguous and harder to reason about.

## Rule Details

The rule applies to tests that use AAA comments:

- `// Arrange`
- `// Act`
- `// Assert`
- `// Arrange & Act`
- `// Act & Assert`
- `// Arrange & Act & Assert`

### Phase Model

Each comment represents one or more phases:

| Comment                      | Phases Covered        |
|-----------------------------|----------------------|
| `// Arrange`                | Arrange              |
| `// Act`                    | Act                  |
| `// Assert`                 | Assert               |
| `// Arrange & Act`          | Arrange + Act        |
| `// Act & Assert`           | Act + Assert         |
| `// Arrange & Act & Assert` | Arrange + Act + Assert |

### Ordering

- Phases must appear in logical order: Arrange → Act → Assert
- Combined comments must respect this ordering
- Invalid examples:
  - introducing an earlier phase after a later one
  - splitting a combined phase incorrectly

Examples:
- `Arrange → Act → Assert` ✅
- `Arrange & Act → Assert` ✅
- `Arrange → Act & Assert` ✅
- `Arrange & Act & Assert` ✅
- `Act → Arrange` ❌
- `Act & Assert → Arrange` ❌

### Uniqueness

- Each phase (Arrange, Act, Assert) must be covered **at most once**
- A phase cannot be reintroduced after it has already appeared

Invalid:
- `Arrange → Arrange`
- `Act → Act`
- `Arrange → Act → Arrange`
- `Arrange & Act → Act` (Act duplicated)
- `Act & Assert → Assert` (Assert duplicated)

### Presence

- If any AAA comment is used, the structure must be valid
- Valid structures include:
  - Full separation: `Arrange → Act → Assert`
  - Partial combinations:
    - `Arrange & Act → Assert`
    - `Arrange → Act & Assert`
  - Fully combined:
    - `Arrange & Act & Assert`
- Missing phases are allowed only if they are not implied elsewhere

### Invalid

```typescript
it("rejects incorrect ordering", () => {
  // Act
  const actual = run();

  // Arrange
  const input = 1;

  // Assert
  expect(actual).toBe(input);
});
```

```typescript
it("rejects duplicate phases via split comments", () => {
  // Arrange & Act
  const actual = run(1);

  // Act
  const next = rerun(actual); // ❌ Act duplicated

  // Assert
  expect(next).toBe(2);
});
```

```typescript
it("rejects reintroducing earlier phases", () => {
  // Arrange
  const input = 1;

  // Act & Assert
  expect(run(input)).toBe(1);

  // Arrange
  const other = 2; // ❌ Arrange after Assert
});
```

```typescript
it("rejects overlapping full coverage", () => {
  // Arrange & Act & Assert
  expect(run(1)).toBe(1);

  // Assert
  expect(1).toBe(1); // ❌ Assert duplicated
});
```

### Valid

```typescript
it("keeps a standard AAA flow", () => {
  // Arrange
  const input = 1;

  // Act
  const actual = run(input);

  // Assert
  expect(actual).toBe(1);
});
```

```typescript
it("allows arrange and act combination", () => {
  // Arrange & Act
  const actual = run(1);

  // Assert
  expect(actual).toBe(1);
});
```

```typescript
it("allows act and assert combination", () => {
  // Arrange
  const input = 1;

  // Act & Assert
  expect(run(input)).toBe(1);
});
```

```typescript
it("allows fully combined AAA", () => {
  // Arrange & Act & Assert
  expect(run(1)).toBe(1);
});
```

```typescript
it("allows tests without AAA comments", () => {
  const result = run(1);
  expect(result).toBe(1);
});
```