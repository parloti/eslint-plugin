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

- Object spreads count as reads of the source object's own members, including interface fields.
- Passing a value to an external typed call counts for members accepted by its parameter contract, whether the argument is an inline literal or a variable. Excess properties and calls to local implementations do not automatically count.
- External string-index contracts also accept dictionary entries, including union-valued contracts such as request headers. Index-based handoffs require the forwarded value to carry the member's declaration; unrelated matching dictionaries and incompatible value types remain reportable.
- Standard-library `JSON.stringify(value)` counts as consumption of the value's own members. Calls with a replacer and shadowed serializers do not automatically count.
- JSON consumption follows nested data properties and array elements through union/intersection types, up to five nested data levels, with cycle detection. Shallow object spreads do not consume nested fields. Const values retain their own member identity when a type annotation changes their property symbols.
- Whole-object reads and dictionary handoffs follow resolved local factory return expressions when return annotations erase member identity. Local call arguments also count when the corresponding parameter is forwarded through object-rest/spread aliases to standard `JSON.stringify`; unrelated serialization in the same function does not count. Recursive calls terminate, and returns inside nested functions are not treated as factory results.
- Values carried by an object property typed `unknown` count as used when handed to a declaration-only method contract, such as an opaque event publisher. The first opaque argument to a declaration-only `.json(...)` method and an opaque `body` property in a declaration-only `.request(...)` method count as serialized transport data; other unknown-typed method and function arguments do not count.
- Framework templates do not count as usage in the framework-neutral rule. Use the optional Angular adapter when Angular template expressions should count.
- Prototype methods and accessors are not exempted by spreading or serializing a class instance.
- Dynamic string-key reads count for the entries of the same const registry, including registries annotated with `Record<string, ...>`. A lookup on a different registry does not exempt its entries.
- Reads through smaller structural contracts count when the host is assignable to that contract, including lifecycle calls through an `OnDestroy`-style interface. Incompatible method signatures remain reportable.
- Object destructuring in `for...of` and `for await...of` loops counts as a read of the selected members, including renamed bindings and optional fields with defaults. Unselected members remain reportable.
- Members exposed through exported type aliases, union/intersection constituents, or nested API properties are public API members even when their declaring interfaces are not exported directly.

Class members without an explicit visibility modifier are treated as public. Private, protected, and `#private` members are ignored.

## Angular template adapter

Angular template analysis is opt-in and is not loaded by the default rule. The `@codeperfect/eslint-config` Angular profile enables the adapter automatically for its scoped files when `angular-eslint` is selected. The adapter recognizes only a `Component` decorator imported from `@angular/core`, parses static inline and external templates with the Angular compiler, respects template-local variables and `$event`, and resolves member reads through the component's TypeScript types.

When configuring the plugin directly, register the Angular entry point under a separate namespace and replace the framework-neutral rule for the Angular files:

```typescript
import { codeperfectPlugin } from "@codeperfect/eslint-plugin";
import { codeperfectAngularPlugin } from "@codeperfect/eslint-plugin/angular";

export default [
  {
    files: ["apps/front/**/*.ts"],
    plugins: {
      codeperfect: codeperfectPlugin,
      "codeperfect-angular": codeperfectAngularPlugin,
    },
    rules: {
      "codeperfect/no-unused-public-members": "off",
      "codeperfect-angular/no-unused-public-members": "error",
    },
  },
];
```

The adapter uses the project's `@angular/compiler` installation and requires version 22.2 or newer. Projects that enable it must provide that optional peer dependency.

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
