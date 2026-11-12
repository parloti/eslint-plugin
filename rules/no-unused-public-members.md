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

- `publicApiFiles` selects public API entries and their transitive exports, as in `no-unused-exports`. For the member rule, each eligible entry's exact parent directory also defines an analysis folder.
- `testFilePatterns` identifies files whose references do not satisfy production use.

By default, analysis is limited to production files matching `**/src/**/*.ts`; files matching `testFilePatterns` are excluded as both hosts and consumers. The rule requires TypeScript parser services with a project program; it does not report when those services are unavailable.

### Analysis folders

Only actual, non-test, non-declaration API files in the TypeScript program define
folders. A host's production consumers must be inside its own folder; references
in sibling packages do not count. Same-file uses count even when the host is
never imported. Public API exemptions still apply.

For example, API entries at `packages/a/src/index.ts` and
`packages/b/src/index.ts` create separate folders. An ordinary
`packages/a/src/feature/index.ts` barrel creates no boundary unless explicitly
selected by `publicApiFiles`. Multiple entries in one folder share that folder.

Distinct nested folders are configuration errors. An API entry at
`src/api/public.ts` covers only `src/api`, not all of `src`. If an eligible host
has no containing folder, the rule throws an actionable `publicApiFiles`
configuration error instead of searching elsewhere or reporting unsupported
unused-member findings. Paths are normalized using filesystem case sensitivity;
containment follows directory components, not string prefixes.

Effective per-file ESLint options remain isolated. This restriction does not
change the consumer scope of `no-unused-exports`, and neither rule requires the
other to be enabled. Use the existing `publicApiFiles` option; no additional
scope option or boundaries-plugin integration is required.

## Rule Details

A member is considered used when a production TypeScript file in its analysis folder contains a concrete reference to it. References in the declaring file count. References only in test files do not.

The rule resolves uses through explicitly implemented or inherited class and interface contracts, and through the declared type of a const object. Public API exposure is based on exported hosts reachable from `publicApiFiles`, including through barrels.

- Object spreads count as reads of the source object's own members, including interface fields.
- Passing a value to an external typed call counts for members accepted by its parameter contract, whether the argument is an inline literal or a variable. Excess properties and calls to local implementations do not automatically count.
- External string-index contracts also accept dictionary entries, including union-valued contracts such as request headers. Index-based handoffs require the forwarded value to carry the member's declaration; unrelated matching dictionaries and incompatible value types remain reportable.
- Standard-library `JSON.stringify(value)` counts as consumption of the value's own members. Calls with a replacer and shadowed serializers do not automatically count.
- JSON consumption follows nested data properties and array elements through union/intersection types, up to five nested data levels, with cycle detection. Shallow object spreads do not consume nested fields. Const values retain their own member identity when a type annotation changes their property symbols.
- Whole-object reads and dictionary handoffs follow resolved local factory return expressions when return annotations erase member identity. Local call arguments also count when the corresponding parameter is forwarded through object-rest/spread aliases and nested local calls to standard `JSON.stringify`; unrelated serialization in the same function does not count. Recursive calls terminate, and returns inside nested functions are not treated as factory results.
- Factory and forwarding searches stay within the host's eligible production files, including at recursive call steps. Calling a sibling implementation does not search that implementation's body; external type contracts remain usable.
- Values carried by an object property typed `unknown` count as used when handed to a declaration-only method contract, such as an opaque event publisher. The first opaque argument to a declaration-only `.json(...)` method and an opaque `body` property in a declaration-only `.request(...)` method count as serialized transport data; other unknown-typed method and function arguments do not count.
- Framework templates do not count as usage in the framework-neutral rule. Use the optional Angular adapter when Angular template expressions should count.
- Prototype methods and accessors are not exempted by spreading or serializing a class instance.
- Dynamic string-key reads count for the entries of the same const registry, including registries annotated with `Record<string, ...>`. A lookup on a different registry does not exempt its entries.
- Reads through smaller structural contracts count when the host is assignable to that contract, including lifecycle calls through an `OnDestroy`-style interface. Incompatible method signatures remain reportable.
- Object destructuring in `for...of` and `for await...of` loops counts as a read of the selected members, including renamed bindings and optional fields with defaults. Unselected members remain reportable.
- Members exposed through exported type aliases, union/intersection constituents, nested API properties, or exported API call/construct signatures are public API members even when their declaring interfaces are not exported directly. Signature inputs, return values, and array elements are included.

Class members without an explicit visibility modifier are treated as public. Private, protected, and `#private` members are ignored.

## Performance

The rule partitions eligible source files by API folder before indexing production
reference symbols and candidate operations. Usage indexes are isolated by
TypeScript program, folder, and test-pattern configuration. Direct references use symbol
and declaration-site lookups; only unresolved members require structural,
whole-object, or local-flow checks. Heritage declarations are also indexed.

For each member name, eager reference resolution follows observed imports back
from its declaration files, including transitive barrels and cycles within the
owner. Same-file declarations remain eligible without imports. Global scripts
and augmentations receive conservative treatment. Name-matching references
without a known dependency path are deferred, not discarded: structural reads
and declaration identity can still establish usage when needed. Whole-object
operations and framework adapters remain eligible independently of imports.
Folder names and forbidden architecture directions never hide actual consumers.

Operation classification is lazy: files whose candidates already have reference
or adapter uses do not trigger spread, serializer, computed-key, or external-call
type/signature analysis. Remaining candidates are checked in batches with
operations as the outer loop, dropping consumed members from later operations.
Literal computed keys skip unrelated names without resolving their key types.
Completed usage answers are cached by member declaration and analysis scope;
negative results are stored once per candidate, not once per candidate-operation
pair. Node/contextual types and property lists are reused within the current
TypeScript checker, including absent contextual types. Declaration identity,
shallow versus nested consumption, and member-specific contract compatibility
still require their existing checks.

Local forwarding and factory returns use separate, completed summaries.
Parameter forwarding is summarized independently of candidate members, with
distinct results for standard JSON serialization and opaque request bodies.
Factory results retain candidate declaration identity. Mutually recursive flow
states are grouped and completed from callees to callers: a reachable consumption
exit makes the group used, and a closed group without an exit completes unused.
Both results are reusable; encountering an in-progress cycle is not a completed
negative answer. Function calls and returns are cataloged once per immutable
syntax snapshot, while semantic answers remain owner/configuration-specific.
Factory returns inside nested functions remain excluded unless that function is
itself reached as a local factory. Completed groups release their temporary
graph records immediately, and remaining traversal queues leave scope when the
query returns. TypeScript-owned trees and types remain owned by the active
program.

Syntax catalogs and native reference-symbol lookups are shared with
`no-unused-exports`, regardless of execution order. Catalogs are collected lazily
for requested source files; the member rule does not build the export rule's
whole-program usage index. Shared dependency edges include imports, re-exports,
import types, and triple-slash references, with conservative global and
augmentation roots. File classifications and member ownership stay rule-local.

Direct public API exports are checked without expanding their types. Nested API
types are searched only for members without production use, stopping when the
member is found rather than expanding every export. Only candidate answers are
retained, not a catalog of every reachable type member. Completed positive and
negative type queries are reused by program, candidate, API location, and
remaining depth. Before expanding an export, a
cached source-dependency graph checks whether its API file and declaring file
can reach the member's declaration. Imports, re-exports, import types,
triple-slash references, and global/module augmentations are included
conservatively.

Nested queries check member declaration identity before resolving child types.
Index elements and call/construct signature types are visited lazily, then
properties; finding the candidate stops later branches. A conservative
declaration-reference graph and visible generic arguments can exclude unrelated
primitive, library, and closed recursive builder branches without instantiating
their children. Unavailable substitutions, captured parameters, and potentially
relevant ambient augmentations fall back to semantic traversal rather than
proving absence. The existing six-level nested API type budget is unchanged;
union/intersection edges do not consume a level. Revisiting a type with more
remaining depth is allowed, and incomplete queries are never cached as absent.

Option-dependent caches weakly retain values for at most one TypeScript program;
switching programs evicts the previous program's entries even if it is still
alive. Each named cache retains only its current configuration. Production usage
indexes additionally follow their scope's lifetime, not a history of folder
names. Public API patterns, test patterns, and project roots remain isolated.
Reusable syntax facts follow immutable syntax snapshots; semantic facts follow
their program, checker, or analysis scope. See
[cache ownership](../design/architecture.md#cache-ownership) for the lifetime
boundaries. Releasing plugin-owned caches does not release trees or types still
held by TypeScript, parser services, or callers.

Framework adapter results are not shared with the framework-neutral rule.
Angular component metadata is isolated by checker, and parsed templates follow
their metadata snapshot. External templates are read once per component/checker
snapshot; replacing the checker rereads them even when its class syntax is reused.

Large projects with many unused members and complex whole-object handoffs can
still require more analysis than projects dominated by direct references.
Increasing Node's heap limit does not remove this analysis cost.

The rule's usage index only scans eligible production TypeScript files inside the
declaring host's API folder. Angular template adapters receive the same scoped
source files. The TypeScript parser still constructs the full configured
program; reducing that baseline memory requires smaller typed-linting projects
or TypeScript project references.

See the [measured performance and limits](../design/architecture.md#measured-performance)
for the reference workloads, default/constrained-heap results, export-only
controls, and diagnostic comparisons. Those observations are not a runtime or
memory guarantee for every project.

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
