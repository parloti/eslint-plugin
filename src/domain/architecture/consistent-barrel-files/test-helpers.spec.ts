import { describe, expect, it } from "vitest";

import { createBody, createExportAll } from "./test-helpers";

describe("test helpers", () => {
  it("builds basic AST shapes", () => {
    // Arrange

    // Act
    const result = {
      body: createBody(),
      exportAllType: createExportAll().type,
    };

    // Assert
    expect(result.body).toStrictEqual([]);
    expect(result.exportAllType).toBe("ExportAllDeclaration");
  });
});
