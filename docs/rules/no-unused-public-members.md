# `codeperfect/no-unused-public-members`

## Summary

Disallow public methods, properties, and fields that are never used by production code, unless their host is exposed by the public API.

The rule checks direct members of:

- classes
- interfaces
- object-shaped type aliases
- const object literals

Private and protected class members are ignored. Nested object members, constructors, and index signatures are outside the rule's scope.

## Enabled by

- internal `codeperfect` plugin registry
- `architecture` preset

## Why this rule exists

Exported classes and types can stay in use while individual methods or properties become dead. `no-unused-exports` checks whether exported hosts are used; this rule checks whether their public members are used.

Hosts exposed by configured public API files are exempt because those members may be consumed by downstream package users.

## Options

```typescript
type Options = {
  publicApiFiles?: string[]; // default: ["**/src/index.ts", "**/__tests__/**/*.ts"]
  testFilePatterns?: string[]; // default: ["**/*.{test,spec,e2e}.ts", "**/__tests__/**/*.ts"]
};
```

- `publicApiFiles` uses the same file globs and transitive barrel detection as `no-unused-exports`.
- `testFilePatterns` identifies files whose references do not satisfy production use.

By default, analysis is limited to production files matching `**/src/**/*.ts`; files matching `testFilePatterns` are excluded as both hosts and consumers. The rule requires TypeScript parser services with a project program; it does not report when those services are unavailable.

## Rule Details

A member is considered used when a production TypeScript file contains a concrete reference to it. References in the declaring file count. References only in test files do not.

The rule resolves uses through explicitly implemented or inherited class and interface contracts, and through the declared type of a const object. Public API exposure is based on exported hosts reachable from `publicApiFiles`, including through barrels.

Class members without an explicit visibility modifier are treated as public. Private, protected, and `#private` members are ignored.

## Invalid

### Unused class method and field

```typescript
// src/service.ts
export class Service {
  unusedMethod(): void {}

  unusedValue = 1;
}
```

### Unused interface or type members

```typescript
// src/model.ts
export interface Model {
  used: string;
  unused: number;
}

export type Options = { enabled: boolean; legacy: boolean };
```

### Test-only use

```typescript
// src/service.ts
export class Service {
  tested(): void {}
}
```

```typescript
// src/service.spec.ts
import { Service } from "./service";

new Service().tested();
```

## Valid

### Production use

```typescript
// src/service.ts
export class Service {
  run(): void {}
}
```

```typescript
// src/consumer.ts
import { Service } from "./service";

new Service().run();
```

### Public API host

```typescript
// src/service.ts
export class Service {
  downstreamOnly(): void {}
}
```

```typescript
// src/index.ts
export { Service } from "./service";
```

### Use through an implemented contract

```typescript
interface Runner {
  run(): void;
}

class Service implements Runner {
  run(): void {}
}

const runner: Runner = new Service();
runner.run();
```
