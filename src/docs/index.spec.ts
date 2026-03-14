import { describe, expect, it } from "vitest";

import {
  noInterfaceMemberDocumentationRule,
  requireExampleLanguageRule,
  singleLineJsdocRule,
} from ".";
import * as noInterfaceMemberDocs from "./no-interface-member-docs";
import * as requireExampleLanguage from "./require-example-language";
import * as singleLineJsdoc from "./single-line-jsdoc";

describe("docs rules", () => {
  it("re-exports the documentation rule modules", () => {
    expect(noInterfaceMemberDocumentationRule).toBe(
      noInterfaceMemberDocs.noInterfaceMemberDocumentationRule,
    );
    expect(requireExampleLanguageRule).toBe(
      requireExampleLanguage.requireExampleLanguageRule,
    );
    expect(singleLineJsdocRule).toBe(singleLineJsdoc.singleLineJsdocRule);
  });
});
