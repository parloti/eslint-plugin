import type { Rule } from "eslint";

import type { Range } from "./match-helpers";

/** Type definition for rule data. */
interface Binding {
  /** Name of the mocked export (object property key). */
  exportedName: string;

  /** Local variable name referenced in the mock factory object. */
  localName: string;

  /** Range of the object property key identifier. */
  propertyKeyRange: Range;

  /** Full range of the object property to replace. */
  propertyRange: Range;

  /** Range of the identifier that references the local variable. */
  propertyValueRange: Range;
}

/** Type definition for rule data. */
interface Declaration {
  /** Range of the identifier being declared (e.g. `x` in `const x = ...`). */
  declarationIdRange: Range;

  /** Range of the initializer expression (the `vi.fn(...)` call). */
  initializerRange: Range;

  /** Local variable name. */
  localName: string;

  /** Range of the full statement to remove. */
  statementRange: Range;
}

/** Type definition for rule data. */
interface ImportInsertPlan {
  /** Range of the last import statement, when present. */
  afterRange?: Range;
}

/** Type definition for rule data. */
interface ImportPlan {
  /** Insert plan when no compatible import exists. */
  insert?: ImportInsertPlan;

  /** Module specifier to import from. */
  moduleSpecifier: string;

  /** Names that must be imported from the module. */
  names: string[];

  /** Update plan when an import can be updated in-place. */
  update?: ImportUpdatePlan;
}

/** Type definition for rule data. */
interface ImportUpdatePlan {
  /** Default import local name, when present. */
  defaultImportName?: string;

  /** Existing named imports from the module. */
  existingNamedImports: string[];

  /** Range of the import statement to replace. */
  range: Range;
}

/** Type definition for rule data. */
interface MemberRewrite {
  /** Exported name to use inside `vi.mocked(...)`. */
  exportedName: string;

  /** Range of the identifier used as the member-expression object. */
  localObjectRange: Range;
}

/** Type definition for rule data. */
interface RuleMatch {
  /** Bindings that can be inlined into the mock factory. */
  bindings: Binding[];

  /** Declarations by local name. */
  declarations: Map<string, Declaration>;

  /** Import insertion/update plan. */
  importPlan: ImportPlan;

  /** Member-expression rewrites for `.mock*` calls. */
  memberRewrites: MemberRewrite[];

  /** True when the first argument is already `import("...")`. */
  mockSpecifierIsImportExpression: boolean;

  /** Range of the first argument to `vi.mock`/`vi.doMock`. */
  mockSpecifierRange: Range;

  /** Module specifier being mocked. */
  moduleSpecifier: string;

  /** Preferred newline sequence used by the file. */
  newline: "\n" | "\r\n";

  /** Node to use for reporting. */
  node: Rule.Node;

  /** Full source text. */
  sourceText: string;
}

export type { Binding, Declaration, ImportPlan, MemberRewrite, RuleMatch };
