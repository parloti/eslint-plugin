import type { Linter, Rule } from "eslint";

import {
  createNoUnusedPublicMembersListener,
  noUnusedPublicMembersRule,
} from "../../domain/architecture/no-unused-public-members/rule";
import { angularTemplateUsageAdapter } from "./no-unused-public-members-template-adapter";

/** Rule variant that includes the opt-in Angular template usage adapter. */
const angularNoUnusedPublicMembersRule: Rule.RuleModule = {
  ...noUnusedPublicMembersRule,
  create: createNoUnusedPublicMembersListener([angularTemplateUsageAdapter]),
};

/** Plugin namespace used by Angular-specific ESLint configuration. */
const codeperfectAngularPlugin = {
  meta: { name: "@codeperfect/eslint-plugin/angular" },
  rules: { "no-unused-public-members": angularNoUnusedPublicMembersRule },
} satisfies NonNullable<Linter.Config["plugins"]>[string];

export { codeperfectAngularPlugin };
