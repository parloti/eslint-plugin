import { describe, expect, it } from "vitest";

import { requireActResultCaptureRule } from "./rule";

describe("require-act-result-capture rule", () => {
  it("defines metadata and messages", () => {
    expect(requireActResultCaptureRule.meta?.messages).toHaveProperty(
      "captureActResult",
    );
    expect(requireActResultCaptureRule.meta?.docs?.description).toContain(
      "Act expressions",
    );
  });
});
