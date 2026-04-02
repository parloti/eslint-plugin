import type { Rule } from "eslint";

import { preferInterfaceTypesRule } from "./rule";

/** Type definition for rule data. */
interface MockNode {
  /** Index signature value map. */
  [key: string]: unknown;

  /** Type field value. */
  type: string;
}

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
const createParameter = (type: string): MockNode =>
  ({
    name: "value",
    type: "Identifier",
    typeAnnotation: createTypeAnnotation(type),
  }) as MockNode;

/**
 * Creates createBareParameter.
 * @returns Return value output.
 * @example
 * ```typescript
 * createBareParameter();
 * ```
 */
const createBareParameter = (): MockNode =>
  ({
    name: "value",
    type: "Identifier",
  }) as MockNode;

/**
 * Creates createParameterProperty.
 * @param type Input type value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createParameterProperty();
 * ```
 */
const createParameterProperty = (type: string): MockNode =>
  ({
    parameter: createParameter(type),
    type: "TSParameterProperty",
  }) as MockNode;

/**
 * Creates createRestParameter.
 * @param type Input type value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createRestParameter();
 * ```
 */
const createRestParameter = (type: string): MockNode =>
  ({
    argument: createParameter(type),
    type: "RestElement",
  }) as MockNode;

/**
 * Creates createFunctionNode.
 * @param overrides Input overrides value.
 * @returns Return value output.
 * @example
 * ```typescript
 * createFunctionNode();
 * ```
 */
const createFunctionNode = (overrides: Partial<MockNode>): MockNode =>
  ({
    params: [],
    type: "FunctionDeclaration",
    ...overrides,
  }) as MockNode;

/**
 * Runs the listener for the supplied node.
 * @param context Rule execution context.
 * @param node Node to run through the listener.
 * @example
 * ```typescript
 * runListener(context, node);
 * ```
 */
const runListener = (context: Rule.RuleContext, node?: MockNode): void => {
  const listeners = preferInterfaceTypesRule.create(context);
  const listener = listeners.FunctionDeclaration as
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
