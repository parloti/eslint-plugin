import { preferViMockedImportRule } from "../../src";

import { createRuleTester } from "../support/rule-tester";

const ruleTester = createRuleTester();

ruleTester.run("prefer-vi-mocked-import", preferViMockedImportRule, {
  invalid: [
    {
      code: [
        "const installDevelopmentDependencies = vi.fn();",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));',
        "installDevelopmentDependencies.mockResolvedValue(void 0);",
        "",
      ].join("\n"),
      errors: [{ messageId: "preferViMockedImport" }],
      filename: "example.spec.ts",
      output: [
        'import { installDevelopmentDependencies } from "./dependencies";',
        "",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies: vi.fn() }));',
        "vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);",
        "",
      ].join("\n"),
    },
    {
      code: [
        "/** Mocked getParentFolder utility. */",
        "const installDevelopmentDependencies = vi.fn();",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));',
        "installDevelopmentDependencies.mockResolvedValue(void 0);",
        "",
        "const x = 0",
        "",
        "const dependencies = vi.fn();",
        'vi.mock(import("./dep"), () => ({ dependencies }));',
        "dependencies.mockResolvedValue(void 0);",
        "",
      ].join("\n"),
      errors: [{ messageId: "preferViMockedImport" }],
      filename: "example.spec.ts",
      output: [
        'import { installDevelopmentDependencies } from "./dependencies";',
        "",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies: vi.fn() }));',
        "vi.mocked(installDevelopmentDependencies).mockResolvedValue(void 0);",
        "",
        "const x = 0",
        "",
        "const dependencies = vi.fn();",
        'vi.mock(import("./dep"), () => ({ dependencies }));',
        "dependencies.mockResolvedValue(void 0);",
        "",
      ].join("\n"),
    },
  ],
  valid: [
    {
      code: [
        "const installDevelopmentDependencies = vi.fn();",
        "console.log(installDevelopmentDependencies);",
        'vi.mock(import("./dependencies"), () => ({ installDevelopmentDependencies }));',
        "installDevelopmentDependencies.mockResolvedValue(void 0);",
        "",
      ].join("\n"),
      filename: "example.spec.ts",
    },
  ],
});
