import { describe, expect, it } from "vitest";

import {
  createDualJsdocContext,
  createRangeMissingContext,
  createSingleJsdocContext,
} from "./comment-utilities-test-helpers";

describe("comment utilities test helpers", () => {
  it("creates single comment contexts", () => {
    const { comment, sourceCode } = createSingleJsdocContext();

    expect(comment.type).toBe("Block");
    expect(sourceCode.getAllComments()).toHaveLength(1);
  });

  it("creates dual comment contexts", () => {
    const { second, sourceCode } = createDualJsdocContext();

    expect(second.value).toContain("second");
    expect(sourceCode.getAllComments()).toHaveLength(2);
  });

  it("creates range-missing contexts", () => {
    const { sourceCode } = createRangeMissingContext();

    expect(sourceCode.getAllComments()).toHaveLength(1);
  });
});
