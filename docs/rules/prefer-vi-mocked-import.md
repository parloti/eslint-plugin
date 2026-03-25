# `codeperfect/prefer-vi-mocked-import`

## Summary

Inline local Vitest mocks and prefer `vi.mocked(...)` call sites.

## Enabled by

- `vitest`
- internal `codeperfect` plugin registry

## Why this rule exists

Vitest mock declarations are easier to follow when the factory owns the mock setup and later call sites use `vi.mocked(...)` consistently.

## Invalid

```ts
const mockedClient = vi.fn();
vi.mock("./client", () => ({ client: mockedClient }));
```

```ts
const installDevelopmentDependencies = vi.fn();
vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));
installDevelopmentDependencies.mockResolvedValue(void 0);
```

## Autofix example

Before:

```ts
const installDevelopmentDependencies = vi.fn();
vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));
installDevelopmentDependencies.mockResolvedValue(void 0);
```

After:

```ts
import { installDevelopmentDependencies } from "./dependencies";

vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies: vi.fn() }));
vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);
```

## Valid

```ts
vi.mock("./client", () => ({ client: vi.fn() }));
```

```ts
const installDevelopmentDependencies = vi.fn();
console.log(installDevelopmentDependencies);
vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));
installDevelopmentDependencies.mockResolvedValue(void 0);
```

```ts
import { installDevelopmentDependencies } from "./dependencies";

vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies: vi.fn() }));
vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);
```
