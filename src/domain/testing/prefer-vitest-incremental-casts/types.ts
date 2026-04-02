import type { ESLintUtils, TSESLint, TSESTree } from "@typescript-eslint/utils";
import type * as ts from "typescript";

/** Context used to build the final replacement for a matching mock object. */
interface BuildMatchResultContext {
  /** TypeScript type checker used for assignability checks. */
  checker: ts.TypeChecker;

  /** Factory function supplied to `vi.mock` or `vi.doMock`. */
  factoryArgument: FactoryFunctionExpression;

  /** Static module specifier used by the mock call. */
  moduleSpecifier: string;

  /** Returned object literal from the mock factory. */
  objectExpression: TSESTree.ObjectExpression;

  /** Property names already present in the rewritten object literal. */
  propertyNames: Set<string>;

  /** Nested property replacements collected for the object literal. */
  replacements: PropertyReplacement[];

  /** Expression returned by the mock factory. */
  returnExpression: TSESTree.Expression;

  /** Full source text of the current file. */
  sourceText: string;

  /** Target type inferred for the factory object. */
  targetType: ts.Type;
}

/** Context required to replace one object literal property safely. */
interface BuildPropertyReplacementContext {
  /** TypeScript type checker used for assignability checks. */
  checker: ts.TypeChecker;

  /** Stable property key name from the mock object literal. */
  keyName: string;

  /** Static module specifier used by the mock call. */
  moduleSpecifier: string;

  /** Supported property being rewritten. */
  property: SupportedProperty;

  /** Parser services supplied by `@typescript-eslint`. */
  services: ParserServices;

  /** Full source text of the current file. */
  sourceText: string;

  /** Target property symbol from the imported module type. */
  targetPropertySymbol: ts.Symbol;
}

/** Input required to analyze a `vi.mock` or `vi.doMock` call. */
interface CollectMatchContext {
  /** Call expression currently being analyzed. */
  callExpression: TSESTree.CallExpression;

  /** TypeScript type checker used for assignability checks. */
  checker: ts.TypeChecker;

  /** Parser services supplied by `@typescript-eslint`. */
  services: ParserServices;

  /** Full source text of the current file. */
  sourceText: string;
}

/** Context used to collect nested property replacements. */
interface CollectPropertyReplacementsContext {
  /** TypeScript type checker used for assignability checks. */
  checker: ts.TypeChecker;

  /** Static module specifier used by the mock call. */
  moduleSpecifier: string;

  /** Returned object literal from the mock factory. */
  objectExpression: TSESTree.ObjectExpression;

  /** Parser services supplied by `@typescript-eslint`. */
  services: ParserServices;

  /** Full source text of the current file. */
  sourceText: string;

  /** Target type inferred for the factory object. */
  targetType: ts.Type;
}

/** Function expressions supported as Vitest mock factories. */
type FactoryFunctionExpression =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionExpression;

/** Resolved inputs required to analyze a matching Vitest mock factory. */
interface FactoryMatchInput {
  /** Factory function supplied to `vi.mock` or `vi.doMock`. */
  factoryArgument: FactoryFunctionExpression;

  /** Static module specifier used by the mock call. */
  moduleSpecifier: string;

  /** Returned object literal from the mock factory. */
  objectExpression: TSESTree.ObjectExpression;

  /** Expression returned by the mock factory. */
  returnExpression: TSESTree.Expression;
}

/** Context used to inspect one callable signature for a mock factory. */
interface MatchingSignatureReturnTypeContext {
  /** TypeScript type checker used for assignability checks. */
  checker: ts.TypeChecker;

  /** First mock-call argument node. */
  firstArgument: ts.Node;

  /** Type resolved for the first mock-call argument. */
  firstArgumentType: ts.Type;

  /** Callable signature being inspected. */
  signature: ts.Signature;

  /** TypeScript node for the factory callback argument. */
  tsFactoryArgument: ts.Node;
}

/** Text replacement emitted for a matching factory object. */
interface MatchResult {
  /** Replacement source text for the returned object expression. */
  replacementText: string;

  /** Absolute range of the return expression to replace. */
  returnExpressionRange: TSESTree.Range;
}

/** Rule message identifiers emitted by this rule. */
type MessageIds = "preferVitestIncrementalCasts";

/** Normalized arguments extracted from a supported mock call. */
interface MockFactoryArguments {
  /** Factory function supplied to `vi.mock` or `vi.doMock`. */
  factoryArgument: FactoryFunctionExpression;

  /** Static or import-expression module argument. */
  moduleArgument: TSESTree.Expression;
}

/** Rule options accepted by this rule. */
type Options = [];

/** Context required to decide whether an outer cast is still needed. */
interface OuterCastContext {
  /** TypeScript type checker used for assignability checks. */
  checker: ts.TypeChecker;

  /** Property names already present in the rewritten object literal. */
  propertyNames: ReadonlySet<string>;

  /** Target type inferred for the factory object. */
  targetType: ts.Type;
}
/** Parser services resolved from the configured TypeScript parser. */
type ParserServices = ReturnType<typeof ESLintUtils.getParserServices>;
/** Individual replacement details for one property inside the object literal. */
interface PropertyReplacement {
  /** Absolute range of the property inside the object literal. */
  range: TSESTree.Range;

  /** Replacement source text for the property. */
  replacementText: string;
}

/** Replacement collection result for the object literal properties. */
interface PropertyReplacementCollection {
  /** Property names already present in the rewritten object literal. */
  propertyNames: Set<string>;

  /** Nested property replacements collected for the object literal. */
  replacements: PropertyReplacement[];
}

/** Context for resolving the target type of a mock factory object literal. */
interface ResolveFactoryTargetTypeContext {
  /** Call expression currently being analyzed. */
  callExpression: TSESTree.CallExpression;

  /** TypeScript type checker used for assignability checks. */
  checker: ts.TypeChecker;

  /** Factory function supplied to `vi.mock` or `vi.doMock`. */
  factoryArgument: FactoryFunctionExpression;

  /** Returned object literal from the mock factory. */
  objectExpression: TSESTree.ObjectExpression;

  /** Parser services supplied by `@typescript-eslint`. */
  services: ParserServices;
}
/** Context for determining whether shorthand syntax remains valid. */
interface ShorthandContext {
  /** Expression used as the property's value. */
  baseValue: TSESTree.Expression;

  /** Stable property key name from the mock object literal. */
  keyName: string;

  /** Whether the property value needs a nested cast. */
  needsCast: boolean;

  /** Supported property being rewritten. */
  property: SupportedProperty;
}
/** Normalized inputs used when matching callable Vitest signatures. */
interface SignatureMatchInputs {
  /** Type resolved for the mock callee expression. */
  calleeType: ts.Type;

  /** First mock-call argument node. */
  firstArgument: ts.Node;

  /** Type resolved for the first mock-call argument. */
  firstArgumentType: ts.Type;

  /** TypeScript node for the factory callback argument. */
  tsFactoryArgument: ts.Node;
}
/** Object literal properties supported by the fixer. */
type SupportedProperty = Extract<
  TSESTree.ObjectLiteralElement,
  TSESTree.Property
> & {
  /** Indicates that computed property syntax is not allowed. */
  computed: false;

  /** Restricts the key to statically readable property names. */
  key: SupportedPropertyKey;

  /** Restricts the property to initializer syntax. */
  kind: "init";

  /** Indicates that method shorthand is not allowed. */
  method: false;

  /** Absolute range of the full property inside the source file. */
  range: TSESTree.Range;

  /** Expression value assigned to the property. */
  value: SupportedPropertyValueRange & TSESTree.Expression;
};
/** Property keys supported by the fixer. */
type SupportedPropertyKey =
  | (SupportedPropertyKeyRange & TSESTree.Identifier)
  | (SupportedPropertyKeyRange & TSESTree.Literal);
/** Stable property-key range metadata. */
interface SupportedPropertyKeyRange {
  /** Absolute range of the property key inside the source file. */
  range: TSESTree.Range;
}
/** Stable property-value range metadata. */
interface SupportedPropertyValueRange {
  /** Absolute range of the property value inside the source file. */
  range: TSESTree.Range;
}
/** Property-symbol lookup keyed by object literal property name. */
type TargetPropertyMap = ReadonlyMap<string, ts.Symbol>;

/** Typed rule context used by the typed RuleCreator wrapper. */
type TypedRuleContext = Readonly<TSESLint.RuleContext<MessageIds, Options>>;

export type {
  BuildMatchResultContext,
  BuildPropertyReplacementContext,
  CollectMatchContext,
  CollectPropertyReplacementsContext,
  FactoryFunctionExpression,
  FactoryMatchInput,
  MatchingSignatureReturnTypeContext,
  MatchResult,
  MessageIds,
  MockFactoryArguments,
  Options,
  OuterCastContext,
  ParserServices,
  PropertyReplacement,
  PropertyReplacementCollection,
  ResolveFactoryTargetTypeContext,
  ShorthandContext,
  SignatureMatchInputs,
  SupportedProperty,
  TargetPropertyMap,
  TypedRuleContext,
};
