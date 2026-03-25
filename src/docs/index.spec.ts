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
    // Arrange
    const actualExports = [
      Object.is(
        noInterfaceMemberDocumentationRule,
        noInterfaceMemberDocs.noInterfaceMemberDocumentationRule,
      ),
      Object.is(
        requireExampleLanguageRule,
        requireExampleLanguage.requireExampleLanguageRule,
      ),
      Object.is(singleLineJsdocRule, singleLineJsdoc.singleLineJsdocRule),
    ];

    // Act
    const [exportsNoInterfaceMemberDocs, exportsRequireExampleLanguage, exportsSingleLineJsdoc] =
      actualExports;

    // Assert
    expect(exportsNoInterfaceMemberDocs).toBe(true);
    expect(exportsRequireExampleLanguage).toBe(true);
    expect(exportsSingleLineJsdoc).toBe(true);
  });
});
