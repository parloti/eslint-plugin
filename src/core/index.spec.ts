import { describe, expect, it } from "vitest";

import * as core from "./index";
import * as preferInterfaceTypes from "./prefer-interface-types";
import { preferInterfaceTypesRule } from "./prefer-interface-types";
describe("core rules", () => {
  it("re-exports the interface rule module", () => {
    expect(core.preferInterfaceTypesRule).toBe(preferInterfaceTypesRule);
    expect(preferInterfaceTypes.preferInterfaceTypesRule).toBe(
      preferInterfaceTypesRule,
    );
  });
});
