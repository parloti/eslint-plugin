declare module "@codeperfect/eslint-config" {
  import type { Linter } from "eslint";

  type ConfigOptions = Record<string, unknown>;

  export function config(
    options?: ConfigOptions,
  ): Promise<Linter.Config | Linter.Config[]>;
}
