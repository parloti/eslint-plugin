# @codeperfect/eslint-plugin

Custom ESLint rules for TypeScript repositories.

## What this package provides

`@codeperfect/eslint-plugin` ships a single ESLint plugin object, ready-to-use first-party presets, and direct exports for every package-owned rule. It does not compose third-party configs, load optional integrations, or provide a wrapper factory for `eslint.config.ts`.

The package scope is intentionally narrow:

- root preset exports for package-owned rules only
- package-owned custom rules
- rule documentation under `docs/rules/`
- a small registry used by tests and benchmarks

## Installation

```bash
npm install -D @codeperfect/eslint-plugin eslint
```

If you lint TypeScript files, also install and configure the parser or plugin stack that your repository already uses.

## Usage

Import a preset if you want the plugin registration and matching rules together:

```typescript
import { defineConfig } from "eslint/config";
import { all } from "@codeperfect/eslint-plugin";

export default defineConfig(all);
```

You can also use a narrower preset such as `architecture`, `core`, `docs`, `testing`, or `aaa`:

```typescript
import { defineConfig } from "eslint/config";
import { aaa, testing } from "@codeperfect/eslint-plugin";

export default defineConfig(testing, aaa);
```

Register the plugin directly in your local ESLint config when you want full manual control:

```typescript
import { defineConfig } from "eslint/config";
import { parser } from "typescript-eslint";
import codeperfectPlugin from "@codeperfect/eslint-plugin";

export default defineConfig({
  files: ["**/*.ts"],
  languageOptions: {
    parser,
    sourceType: "module",
  },
  plugins: {
    codeperfect: codeperfectPlugin,
  },
  rules: {
    "codeperfect/prefer-interface-types": "error",
    "codeperfect/require-example-language": "error",
  },
});
```

## Exported surface

The root package exports:

- the default plugin object
- the named `codeperfectPlugin` export
- the named preset exports: `all`, `architecture`, `core`, `docs`, `testing`, and `aaa`
- the `customRules` registry
- each rule module as a named export

Example:

```typescript
import codeperfectPlugin, {
  all,
  customRules,
  preferInterfaceTypesRule,
} from "@codeperfect/eslint-plugin";

void codeperfectPlugin;
void all;
void customRules;
void preferInterfaceTypesRule;
```

## Package-owned rules

- `codeperfect/assert-actual-expected-names`
- `codeperfect/barrel-files-exports-only`
- `codeperfect/consistent-barrel-files`
- `codeperfect/enforce-aaa-phase-purity`
- `codeperfect/enforce-aaa-structure`
- `codeperfect/no-interface-member-docs`
- `codeperfect/no-reexports-outside-barrels`
- `codeperfect/prefer-interface-types`
- `codeperfect/prefer-vi-mocked-import`
- `codeperfect/require-aaa-sections`
- `codeperfect/require-act-result-capture`
- `codeperfect/require-example-language`
- `codeperfect/require-test-companion`
- `codeperfect/single-act-statement`
- `codeperfect/single-line-jsdoc`

Rule documentation lives in `docs/rules/` and each rule metadata entry points at the matching page.

## Internal layout

- `src/rules/` is the shared entrypoint for exported rule modules.
- `src/architecture/`, `src/core/`, `src/docs/`, and `src/testing/` own the concrete rule implementations.
- `src/custom-rules.ts` is the registry used by tests and benchmarks.

## Validation

When changing this package:

- run `npm run validate`
- run `npm run validate` a second time to confirm deterministic results
- keep the README and rule documentation aligned with the exported surface

## License

MIT
