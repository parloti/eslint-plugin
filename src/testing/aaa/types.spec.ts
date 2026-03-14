import { describe, expect, it } from "vitest";

import type { AaaPhase, TestBlockAnalysis } from "./types";

describe("AAA types", () => {
  it("exposes the shared AAA type surface", () => {
    const phase: AaaPhase = "Act";
    const analysis = void 0 as TestBlockAnalysis | undefined;

    expect(phase).toBe("Act");
    expect(analysis).toBeUndefined();
  });
});
