import { describe, expect, it } from "vitest";

import { createBody, createExportAll } from "./test-helpers";

describe("test helpers", () => {
  it("builds basic AST shapes", () => {
    expect(createBody()).toStrictEqual([]);
    expect(createExportAll().type).toBe("ExportAllDeclaration");
  });
});
