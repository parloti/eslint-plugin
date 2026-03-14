import { describe, expect, it } from "vitest";

import {
  assertActualExpectedNamesRule,
  enforceAaaPhasePurityRule,
  enforceAaaStructureRule,
  preferViMockedImportRule,
  requireAaaSectionsRule,
  requireActResultCaptureRule,
  requireTestCompanionRule,
  singleActStatementRule,
} from ".";
import * as assertActualExpectedNames from "./assert-actual-expected-names";
import * as enforceAaaPhasePurity from "./enforce-aaa-phase-purity";
import * as enforceAaaStructure from "./enforce-aaa-structure";
import * as preferViMockedImport from "./prefer-vi-mocked-import";
import * as requireAaaSections from "./require-aaa-sections";
import * as requireActResultCapture from "./require-act-result-capture";
import * as requireTestCompanion from "./require-test-companion";
import * as singleActStatement from "./single-act-statement";

describe("testing rules", () => {
  it("re-exports the testing rule modules", () => {
    expect(assertActualExpectedNamesRule).toBe(
      assertActualExpectedNames.assertActualExpectedNamesRule,
    );
    expect(enforceAaaPhasePurityRule).toBe(
      enforceAaaPhasePurity.enforceAaaPhasePurityRule,
    );
    expect(enforceAaaStructureRule).toBe(
      enforceAaaStructure.enforceAaaStructureRule,
    );
    expect(preferViMockedImportRule).toBe(
      preferViMockedImport.preferViMockedImportRule,
    );
    expect(requireAaaSectionsRule).toBe(
      requireAaaSections.requireAaaSectionsRule,
    );
    expect(requireActResultCaptureRule).toBe(
      requireActResultCapture.requireActResultCaptureRule,
    );
    expect(requireTestCompanionRule).toBe(
      requireTestCompanion.requireTestCompanionRule,
    );
    expect(singleActStatementRule).toBe(
      singleActStatement.singleActStatementRule,
    );
  });
});
