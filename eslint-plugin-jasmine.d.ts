declare module "eslint-plugin-jasmine" {
  import type { Linter, Rule } from "eslint";

  declare const plugin: {
    /** Field value. */
    configs: {
      /** Field value. */
      recommended: {
        /** Field value. */
        rules: Linter.RulesRecord;
      };
    };

    /** Field value. */
    rules: Record<string, Rule.RuleModule>;
  };

  export = plugin;
}
