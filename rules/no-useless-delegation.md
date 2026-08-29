# `codeperfect/no-useless-delegation`

## Summary

Disallow named functions that only forward their parameters to another synchronous call.

## Enabled by

- `core`
- internal `codeperfect` plugin registry

## Why this rule exists

Direct forwarding functions add another name and call frame without changing behavior. Prefer importing or calling the target directly unless the wrapper genuinely adapts behavior.

## Invalid

```typescript
import { runAllInOne as runAllInOneApplication } from "../application";

export function runAllInOne(options: Options): Promise<void> {
  return runAllInOneApplication(options);
}
```

```typescript
const run = (options: Options) => application.run(options);
```

```typescript
const run = (...arguments_: unknown[]) => application.run(...arguments_);
```

## Valid

```typescript
const run = (options: Options) => application.run(normalize(options));
```

```typescript
const run = async (options: Options) => await application.run(options);
```

```typescript
class Application {
  run(options: Options): unknown {
    return service.run(options);
  }
}
```

## Rule Behavior

The rule checks function declarations and variables initialized with arrow functions or function expressions. It requires an exact parameter-to-argument match, including matching rest/spread parameters.

It does not inspect object or class methods, asynchronous functions, self-recursion, literal receiver method calls, destructured or defaulted parameters, or wrappers that transform arguments or contain additional statements. The rule has no autofix because deleting a wrapper can change module and public API contracts.
