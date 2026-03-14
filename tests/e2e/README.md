# E2E Rule Tests

Rule-level end-to-end coverage lives here.

These specs complement the unit tests under `src/**/*.spec.ts` by exercising the published rule modules with real ESLint parsing via `@typescript-eslint/rule-tester`.

Scope:

- one plugin-level spec per exported custom rule
- real temp directories under `tmp/` for rules that inspect neighboring files
- output assertions for autofix rules

Run only this suite with:

```bash
npm test -- tests/e2e/*.spec.ts --coverage.enabled=false
```

Run the full package validation with:

```bash
npm run validate
```
