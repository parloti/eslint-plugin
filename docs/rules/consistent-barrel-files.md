# `codeperfect/consistent-barrel-files`

## Summary

Enforce a consistent barrel file strategy by either requiring or forbidding barrel files with allowed names.

## Enabled by

- `barrel-files`
- internal `codeperfect` plugin registry

## Why this rule exists

Repositories should choose a clear barrel-file strategy. Mixed naming or partially adopted barrels create ambiguous import surfaces and inconsistent folder conventions.

## Options

```typescript
type Options = {
  enforce?: boolean; // default: true
  allowedNames?: string[]; // default: ["index"]
};
```

* `enforce: true`

  * Folders must include a barrel file with an allowed name
* `enforce: false`

  * Barrel files with allowed names must not exist
* `allowedNames`

  * Defines which filenames are considered barrel files (e.g. `"index"`, `"mod"`, etc.)

## Rule Details

* A "barrel file" is any file whose name matches one of the `allowedNames`
* The rule applies to folders containing at least one non-barrel module file
* All folders must follow the same strategy:

  * either consistently include a barrel file (`enforce: true`)
  * or consistently avoid them (`enforce: false`)
* Mixed usage across folders is not allowed

## Invalid

### Missing required barrel file (`enforce: true`)

```tree
feature/
  feature.ts
```

### Forbidden barrel file present (`enforce: false`)

```tree
feature/
  feature.ts
  index.ts
```

### Mixed strategy across folders

```tree
featureA/
  featureA.ts
  index.ts

featureB/
  featureB.ts
```

## Valid

### Enforced barrel files (`enforce: true`)

```tree
feature/
  feature.ts
  index.ts
```

```typescript
// feature/index.ts
export * from "./feature";
```

```typescript
// feature/feature.ts
export const feature = 1;
```

### No barrel files (`enforce: false`)

```tree
feature/
  feature.ts
```

### Custom allowed barrel names

With `{ allowedNames: ["mod"] }`:

```tree
feature/
  feature.ts
  mod.ts
```