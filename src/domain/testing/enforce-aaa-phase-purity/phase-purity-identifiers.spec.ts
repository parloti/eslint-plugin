import { describe, expect, it } from "vitest";

import {
  getAssertReferencedIdentifiers,
  isActResultAsserted,
} from "./phase-purity-identifiers";

describe("enforce-aaa-phase-purity phase-purity-identifiers", () => {
  it("exports the identifier helpers", () => {
    // Arrange
    const helperTypes = [
      typeof getAssertReferencedIdentifiers,
      typeof isActResultAsserted,
    ] as const;

    // Act & Assert
    expect(helperTypes).toStrictEqual(["function", "function"]);
  });
});
