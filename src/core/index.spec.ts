import { describe, expect, it } from "vitest";

import * as core from "./index";
import * as noMultipleDeclarators from "./no-multiple-declarators";
import { noMultipleDeclaratorsRule } from "./no-multiple-declarators";
import * as preferInterfaceTypes from "./prefer-interface-types";
import { preferInterfaceTypesRule } from "./prefer-interface-types";
describe("core rules", () => {
  it("re-exports the core rule modules", () => {
    expect(core.noMultipleDeclaratorsRule).toBe(noMultipleDeclaratorsRule);
    expect(noMultipleDeclarators.noMultipleDeclaratorsRule).toBe(
      noMultipleDeclaratorsRule,
    );
    expect(core.preferInterfaceTypesRule).toBe(preferInterfaceTypesRule);
    expect(preferInterfaceTypes.preferInterfaceTypesRule).toBe(
      preferInterfaceTypesRule,
    );
  });
});
