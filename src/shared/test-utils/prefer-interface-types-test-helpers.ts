import type { Rule } from "eslint";

import { preferInterfaceTypesRule } from "../../domain/core/prefer-interface-types/rule";

/** Type definition for rule data. */
interface MockNode {
  /** Index signature value map. */
  [key: string]: unknown;

  /** Type field value. */
  type: string;
}

/** Listener keys exposed by this rule helper. */
type PreferInterfaceTypesListener =
  | "ArrowFunctionExpression"
  | "FunctionDeclaration"
  | "FunctionExpression"
  | "TSCallSignatureDeclaration"
  | "TSConstructSignatureDeclaration"
  | "TSDeclareFunction"
  | "TSFunctionType"
  | "TSMethodSignature"
  | "VariableDeclarator";

/** Type definition for rule data. */
interface ReportDescriptorDetails {
  /** MessageId field value. */
  messageId?: string;

  /** Node field value. */
  node?: Rule.Node;
}

/** Type definition for rule data. */
interface ReportEntry {
  /** MessageId helper value. */
  messageId: string | undefined;

  /** NodeType field value. */
  nodeType: string | undefined;
}

/** Type definition for rule data. */
interface RuleContextState {
  /** Context field value. */
  context: Rule.RuleContext;

  /** Reports field value. */
  reports: ReportEntry[];
}

/** Type definition for rule data. */
interface TypeAnnotationWrapper {
  /** TypeAnnotation field value. */
  typeAnnotation: {
    /** Type field value. */
    type: string;

    /** Nested annotation for wrappers. */
    typeAnnotation?: MockNode;

    /** Nested members for union/intersection wrappers. */
    types?: MockNode[];
  };
}

/**
 * Creates createContext.
 * @returns Return value output.
 * @example
 * ```typescript
 * createContext();
 * ```
 */
const createContext = (): RuleContextState => {
  const reports: ReportEntry[] = [];
  const context: Rule.RuleContext = {
    id: "prefer-interface-types",
    options: [],
    report: (descriptor: Rule.ReportDescriptor): void => {
      const { messageId, node } = descriptor as ReportDescriptorDetails;
      const reportEntry: ReportEntry = { messageId, nodeType: node?.type };

      reports.push(reportEntry);
    },
  } as unknown as Rule.RuleContext;

  return { context, reports };
};

/**
 * Creates createTypeAnnotation.
 * @param type Input type value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createTypeAnnotation();
 * ```
 */
const createTypeAnnotation = (type: string): TypeAnnotationWrapper => ({
  typeAnnotation: { type },
});

/**
 * Creates createParameter.
 * @param type Input type value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createParameter();
 * ```
 */
const createParameter = (type: string): MockNode => ({
  name: "value",
  type: "Identifier",
  typeAnnotation: createTypeAnnotation(type),
});

/**
 * Creates createBareParameter.
 * @returns Return value output.
 * @example
 * ```typescript
 * createBareParameter();
 * ```
 */
const createBareParameter = (): MockNode => ({
  name: "value",
  type: "Identifier",
});

/**
 * Creates createParameterProperty.
 * @param type Input type value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createParameterProperty();
 * ```
 */
const createParameterProperty = (type: string): MockNode => ({
  parameter: createParameter(type),
  type: "TSParameterProperty",
});

/**
 * Creates createRestParameter.
 * @param type Input type value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createRestParameter();
 * ```
 */
const createRestParameter = (type: string): MockNode => ({
  argument: createParameter(type),
  type: "RestElement",
});

/**
 * Creates createFunctionNode.
 * @param overrides Input overrides value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createFunctionNode();
 * ```
 */
const createFunctionNode = (overrides: Partial<MockNode>): MockNode => ({
  params: [],
  type: "FunctionDeclaration",
  ...overrides,
});

/**
 * Runs the selected listener for the supplied node.
 * @param context Rule execution context.
 * @param node Node to run through the listener.
 * @param listenerName Listener key to execute.
 * @example
 * ```typescript
 * runListener(context, node);
 * ```
 */
const runListener = (
  context: Rule.RuleContext,
  node?: MockNode,
  listenerName: PreferInterfaceTypesListener = "FunctionDeclaration",
): void => {
  const listeners = preferInterfaceTypesRule.create(context);
  const listener = listeners[listenerName] as
    | ((node: Rule.Node) => void)
    | undefined;

  listener?.(node as unknown as Rule.Node);
};

export {
  createBareParameter,
  createContext,
  createFunctionNode,
  createParameter,
  createParameterProperty,
  createRestParameter,
  createTypeAnnotation,
  runListener,
};
