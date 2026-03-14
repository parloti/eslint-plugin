import { describe, expect, it } from "vitest";

import * as types from "./types";

describe("consistent barrel files types", () => {
  it("loads the module", () => {
    expect(types).toBeDefined();
  });
});
