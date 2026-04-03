import { describe, expect, it } from "vitest";

import { createBody, createExportAll } from "./test-helpers";

describe("test helpers", () => {
  it("builds basic AST shapes", () => {
    // Arrange
    const expectedBody: [] = [];
    const expectedExportAllType = "ExportAllDeclaration";

    // Act
    const result = {
      body: createBody(),
      exportAllType: createExportAll().type,
    };

    // Assert
    expect(result.body).toStrictEqual(expectedBody);
    expect(result.exportAllType).toBe(expectedExportAllType);
  });
});
