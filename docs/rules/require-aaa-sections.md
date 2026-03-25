# `codeperfect/require-aaa-sections`

## Summary

Require supported `it(...)` and `test(...)` blocks to include `// Act` and `// Assert` sections, with an optional `// Arrange`, using consistent structure and spacing.

## Enabled by

- `testing`
- internal `codeperfect` plugin registry

## Why this rule exists

Explicit AAA section comments make tests easier to scan and reason about. By making `Arrange` optional and forbidding empty sections, the rule keeps tests both **structured** and **concise**, avoiding ceremonial boilerplate.

## Rule Details

The rule applies to test blocks using:

- `it(...)`
- `test(...)`

### Required sections

- Tests must include:
  - `// Arrange` is optional
  - `// Act`
  - `// Assert`
- Sections must use exact casing and formatting

### Combined sections

- Combined comments are allowed:
  - `// Arrange & Act`
  - `// Act & Assert`
  - `// Arrange & Act & Assert`
- Combined sections must fully replace the individual sections they cover
- Mixed usage (e.g. `// Act` + `// Act & Assert`) is not allowed

### Placement rules

- No executable code is allowed before the first section comment
- If present, `// Arrange` must be the first section
- Sections must be separated by a blank line **only when they follow another section**:
  - a blank line must appear immediately before `// Act` **if it follows `// Arrange`**
  - a blank line must appear immediately before `// Assert` **if it follows `// Act` or `// Arrange`**
- No blank line is required before the first section comment

### Empty sections (forbidden)

- Sections must contain at least one executable statement
- Empty sections are not allowed:
  - `// Arrange` with no code → ❌
  - `// Act` with no code → ❌
  - `// Assert` with no code → ❌

### Autofix behavior

The fixer applies the smallest safe transformation:

- **Missing sections**
  - inserts `// Act` and `// Assert` when possible
- **Empty sections**
  - removes empty `// Arrange`
  - merges `// Act` with `// Assert` when one is empty
- **Spacing**
  - inserts required blank lines
- **Combined sections**
  - may collapse adjacent sections into a combined comment

The fixer does not:
- reorder code
- infer intent beyond local structure

### Non-goals

- This rule does not validate:
  - ordering correctness (handled by `enforce-aaa-structure`)
  - phase purity (handled by `enforce-aaa-phase-purity`)

## Invalid

### Missing required sections

```typescript
it("captures the result", () => {
  const result = run();
  expect(result).toBe(1);
});
```

### Empty Arrange (should be removed)

```typescript
it("has empty arrange", () => {
  // Arrange // ❌ Empty section

  // Act
  const result = run();

  // Assert
  expect(result).toBe(1);
});
```

### Empty Act (should merge with Assert)

```typescript
it("has empty act", () => {
  // Arrange
  const input = 1;

  // Act // ❌ Empty section

  // Assert
  expect(run(input)).toBe(1);
});
```

### Empty Assert (invalid structure)

```typescript
it("has empty assert", () => {
  // Act
  run();
  
  // Assert // ❌ Empty section
});
```

### Mixed combined and individual sections

```typescript
it("rejects mixed section styles", () => {
  // Act & Assert
  expect(run()).toBe(1);

  // Assert // ❌ duplicate
  expect(1).toBe(1);
});
```

## Autofix examples

### Remove empty Arrange

**Before**

```typescript
it("has empty arrange", () => {
  // Arrange

  // Act
  const result = run();

  // Assert
  expect(result).toBe(1);
});
```

**After**

```typescript
it("has empty arrange", () => {
  // Act
  const result = run();

  // Assert
  expect(result).toBe(1);
});
```

### Merge empty Act into Assert

**Before**

```typescript
it("has empty act", () => {
  // Arrange
  const input = 1;

  // Act

  // Assert
  expect(run(input)).toBe(1);
});
```

**After**

```typescript
it("has empty act", () => {
  // Arrange
  const input = 1;

  // Act & Assert
  expect(run(input)).toBe(1);
});
```

### Insert missing sections

**Before**

```typescript
it("captures the result", () => {
  const result = run();
  expect(result).toBe(1);
});
```

**After**

```typescript
it("captures the result", () => {
  // Act
  const result = run();

  // Assert
  expect(result).toBe(1);
});
```

## Valid

### No Arrange section

```typescript
it("skips arrange when unnecessary", () => {
  // Act
  const result = run();

  // Assert
  expect(result).toBe(1);
});
```

### Full AAA structure

```typescript
test("uses full AAA comments", () => {
  // Arrange
  const input = 1;

  // Act
  const result = run(input);

  // Assert
  expect(result).toBe(1);
});
```

### Combined Act & Assert

```typescript
it("combines act and assert", () => {
  // Act & Assert
  expect(run()).toBe(1);
});
```

### Fully combined

```typescript
it("uses a single section", () => {
  // Arrange & Act & Assert
  expect(run()).toBe(1);
});
```