import { describe, expect, it } from "vitest";

import {
  assertActualExpectedNamesRule,
  enforceAaaPhasePurityRule,
  enforceAaaStructureRule,
  preferViMockedImportRule,
  preferVitestIncrementalCastsRule,
  requireAaaSectionsRule,
  requireActResultCaptureRule,
  requireTestCompanionRule,
  singleActStatementRule,
} from ".";
import * as assertActualExpectedNames from "./assert-actual-expected-names";
import * as enforceAaaPhasePurity from "./enforce-aaa-phase-purity";
import * as enforceAaaStructure from "./enforce-aaa-structure";
import * as preferViMockedImport from "./prefer-vi-mocked-import";
import * as preferVitestIncrementalCasts from "./prefer-vitest-incremental-casts";
import * as requireAaaSections from "./require-aaa-sections";
import * as requireActResultCapture from "./require-act-result-capture";
import * as requireTestCompanion from "./require-test-companion";
import * as singleActStatement from "./single-act-statement";

describe("testing rules", () => {
  it("re-exports the testing rule modules", () => {
    // Arrange
    const actualRules = [
      assertActualExpectedNamesRule,
      enforceAaaPhasePurityRule,
      enforceAaaStructureRule,
      preferViMockedImportRule,
      preferVitestIncrementalCastsRule,
      requireAaaSectionsRule,
      requireActResultCaptureRule,
      requireTestCompanionRule,
      singleActStatementRule,
    ];

    // Act
    const expectedRules = [
      assertActualExpectedNames.assertActualExpectedNamesRule,
      enforceAaaPhasePurity.enforceAaaPhasePurityRule,
      enforceAaaStructure.enforceAaaStructureRule,
      preferViMockedImport.preferViMockedImportRule,
      preferVitestIncrementalCasts.preferVitestIncrementalCastsRule,
      requireAaaSections.requireAaaSectionsRule,
      requireActResultCapture.requireActResultCaptureRule,
      requireTestCompanion.requireTestCompanionRule,
      singleActStatement.singleActStatementRule,
    ];

    // Assert
    expect(actualRules).toStrictEqual(expectedRules);
  });
});
