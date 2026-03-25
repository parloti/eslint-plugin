# `codeperfect/prefer-vi-mocked-import`

## Summary

Prefer inline mock factories in `vi.mock` and use `vi.mocked(...)` for interacting with mocked imports.

## Enabled by

- `vitest`
- internal `codeperfect` plugin registry

## Why this rule exists

Vitest mocks are easier to understand when:

- mock implementations are defined inline within `vi.mock`
- interactions with mocked imports use `vi.mocked(...)` for clarity and type safety

Separating mock declarations from their factory or interacting with mocks directly can make tests harder to follow and less consistent.

## Rule Details

This rule enforces two behaviors:

### 1. Inline mock factories

- Disallow defining mocks outside `vi.mock` and passing them into the factory
- Require mocks to be created inline inside the `vi.mock` factory

### 2. Prefer `vi.mocked(...)`

- When interacting with a mocked import, require wrapping it with `vi.mocked(...)`
- Direct usage of mock methods on imported values is disallowed

### Exceptions

- If a mock variable is used outside the `vi.mock` factory, it is allowed to remain external
- Local mocks not tied to module mocking are not affected

## Invalid

### External mock passed into factory

```typescript
const mockedClient = vi.fn();
vi.mock("./client", () => ({ client: mockedClient }));
```

```typescript
const installDevelopmentDependencies = vi.fn();
vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));
installDevelopmentDependencies.mockResolvedValue(void 0); // ❌ not using vi.mocked
```

### Direct interaction without `vi.mocked`

```typescript
import { installDevelopmentDependencies } from "./dependencies";

vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies: vi.fn() }));

installDevelopmentDependencies.mockResolvedValue(void 0); // ❌ should use vi.mocked
```

## Autofix

* Inlines mock factories inside `vi.mock`
* Rewrites mock interactions to use `vi.mocked(...)`
* Adds missing imports when required

### Before

```typescript
const installDevelopmentDependencies = vi.fn();
vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));
installDevelopmentDependencies.mockResolvedValue(void 0);
```

### After

```typescript
import { installDevelopmentDependencies } from "./dependencies";

vi.mock(import("./dependencies"), () => ({
  installDevelopmentDependencies: vi.fn(),
}));

vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);
```

## Valid

### Inline mock factory

```typescript
vi.mock("./client", () => ({ client: vi.fn() }));
```

### External mock used elsewhere (allowed)

```typescript
const installDevelopmentDependencies = vi.fn();
console.log(installDevelopmentDependencies);

vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));

installDevelopmentDependencies.mockResolvedValue(void 0);
```

### Proper use of `vi.mocked`

```typescript
import { installDevelopmentDependencies } from "./dependencies";

vi.mock(import("./dependencies"), () => ({
  installDevelopmentDependencies: vi.fn(),
}));

vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);
```

### Local mocks not tied to module mocking

```typescript
const fn = vi.fn();
fn.mockReturnValue(1);
```