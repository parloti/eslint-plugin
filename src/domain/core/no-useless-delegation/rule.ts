import type { Rule } from "eslint";

/** One named parameter and whether it must be spread at the call site. */
interface DelegatedParameter {
  /** Whether this parameter uses rest syntax. */
  isRest: boolean;
  /** Parameter identifier name. */
  name: string;
}

/** Minimal ESTree node shape used to inspect pass-through functions. */
interface Node {
  /** Dynamically read child nodes and parser-specific properties. */
  [key: string]: unknown;
  /** Whether the function is asynchronous. */
  async?: boolean;
  /** Whether the function is a generator. */
  generator?: boolean;
  /** ESTree discriminator. */
  type: string;
}

/**
 * Resolves a node value when it is an ESTree node.
 * @param value Candidate AST value.
 * @returns The value as an ESTree node when it has a type discriminator.
 * @example
 * ```typescript
 * const node = asNode({ type: "Identifier" });
 * ```
 */
const asNode = (value: unknown): Node | undefined =>
  typeof value === "object" && value !== null && "type" in value
    ? (value as Node)
    : void 0;

/**
 * Resolves a node array while rejecting malformed AST data.
 * @param value Candidate AST value.
 * @returns AST nodes when every array item is a node.
 * @example
 * ```typescript
 * const nodes = asNodeArray([{ type: "Identifier" }]);
 * ```
 */
const asNodeArray = (value: unknown): Node[] | undefined =>
  Array.isArray(value) && value.every((item) => asNode(item) !== void 0)
    ? (value as Node[])
    : void 0;

/**
 * Reads an identifier name from a node.
 * @param node Candidate identifier node.
 * @returns Identifier name when the node is an identifier.
 * @example
 * ```typescript
 * const name = getIdentifierName({ name: "run", type: "Identifier" });
 * ```
 */
const getIdentifierName = (node: Node | undefined): string | undefined =>
  node?.type === "Identifier" && typeof node["name"] === "string"
    ? node["name"]
    : void 0;

/**
 * Gets the called expression from a function with one return statement.
 * @param functionNode Function node to inspect.
 * @returns The directly returned call expression when present.
 * @example
 * ```typescript
 * const call = getDelegatedCall(functionNode);
 * ```
 */
const getDelegatedCall = (functionNode: Node): Node | undefined => {
  if (functionNode.async === true || functionNode.generator === true) {
    return void 0;
  }

  const body = asNode(functionNode["body"]);
  if (body === void 0) {
    return void 0;
  }

  if (body.type === "CallExpression") {
    return body;
  }

  const statements = asNodeArray(body["body"]);
  if (body.type !== "BlockStatement" || statements?.length !== 1) {
    return void 0;
  }

  const returnStatement = statements[0];
  return returnStatement?.type === "ReturnStatement"
    ? asNode(returnStatement["argument"])
    : void 0;
};

/**
 * Gets parameter names and whether each parameter is a rest parameter.
 * @param functionNode Function node to inspect.
 * @returns Named parameter metadata when every parameter is supported.
 * @example
 * ```typescript
 * const parameters = getParameters(functionNode);
 * ```
 */
const getParameters = (
  functionNode: Node,
): DelegatedParameter[] | undefined => {
  const parameters = asNodeArray(functionNode["params"]);
  if (parameters === void 0) {
    return void 0;
  }

  const result: DelegatedParameter[] = [];
  for (const parameter of parameters) {
    const isRest = parameter.type === "RestElement";
    const name = getIdentifierName(
      isRest ? asNode(parameter["argument"]) : parameter,
    );
    if (name === void 0) {
      return void 0;
    }

    result.push({ isRest, name });
  }

  return result;
};

/**
 * Determines whether one call argument forwards its corresponding parameter.
 * @param argument Call argument to inspect.
 * @param parameter Corresponding function parameter.
 * @returns Whether the argument forwards the parameter without change.
 * @example
 * ```typescript
 * const forwards = forwardsParameter(argument, parameter);
 * ```
 */
const forwardsParameter = (
  argument: Node,
  parameter: DelegatedParameter,
): boolean => {
  if (parameter.isRest) {
    return (
      argument.type === "SpreadElement" &&
      getIdentifierName(asNode(argument["argument"])) === parameter.name
    );
  }

  return getIdentifierName(argument) === parameter.name;
};

/**
 * Determines whether a node is a plain named reference.
 * @param node Candidate receiver node to inspect.
 * @returns Whether the node is a plain identifier reference.
 * @example
 * ```typescript
 * const isNamed = isNamedReceiver({ type: "Identifier" });
 * ```
 */
const isNamedReceiver = (node?: Node): boolean => node?.type === "Identifier";

/**
 * Determines whether a function does nothing except directly call another function.
 * @param functionNode Function node to inspect.
 * @param functionName Declared wrapper function name.
 * @returns Whether the function is an exact synchronous delegation.
 * @example
 * ```typescript
 * const isDelegation = isUselessDelegation(functionNode, "run");
 * ```
 */
const isUselessDelegation = (
  functionNode: Node,
  functionName: string,
): boolean => {
  const call = getDelegatedCall(functionNode);
  const parameters = getParameters(functionNode);
  const arguments_ = asNodeArray(call?.["arguments"]);
  const callee = asNode(call?.["callee"]);

  if (
    call?.type !== "CallExpression" ||
    parameters === void 0 ||
    arguments_ === void 0 ||
    callee === void 0 ||
    // A method call is only a replaceable delegation when its receiver is a
    // plain named reference (e.g. `service.run`). Expression receivers such
    // as type assertions, calls, or literals cannot be inlined at the call
    // site, so the wrapper is not useless.
    (callee.type === "MemberExpression" &&
      !isNamedReceiver(asNode(callee["object"]))) ||
    getIdentifierName(callee) === functionName ||
    arguments_.length !== parameters.length
  ) {
    return false;
  }

  return arguments_.every((argument, index) => {
    const parameter = parameters[index];
    return parameter !== void 0 && forwardsParameter(argument, parameter);
  });
};

/**
 * Reports a function when it is a no-op delegation.
 * @param context Rule execution context.
 * @param functionNode Function node to inspect.
 * @param nameNode Declared wrapper name node.
 * @example
 * ```typescript
 * reportIfUselessDelegation(context, functionNode, nameNode);
 * ```
 */
const reportIfUselessDelegation = (
  context: Rule.RuleContext,
  functionNode: Node,
  nameNode: Node | undefined,
): void => {
  const functionName = getIdentifierName(nameNode);
  if (
    functionName === void 0 ||
    !isUselessDelegation(functionNode, functionName)
  ) {
    return;
  }

  context.report({
    messageId: "uselessDelegation",
    node: nameNode as unknown as Rule.Node,
  });
};

/** ESLint rule implementation for functions that only forward their arguments. */
const noUselessDelegationRule: Rule.RuleModule = {
  create: (context: Rule.RuleContext): Rule.RuleListener => ({
    FunctionDeclaration: (node: Rule.Node): void => {
      const functionNode = node as unknown as Node;
      reportIfUselessDelegation(
        context,
        functionNode,
        asNode(functionNode["id"]),
      );
    },
    VariableDeclarator: (node: Rule.Node): void => {
      const declarator = node as unknown as Node;
      const initializer = asNode(declarator["init"]);
      if (
        initializer?.type !== "ArrowFunctionExpression" &&
        initializer?.type !== "FunctionExpression"
      ) {
        return;
      }

      reportIfUselessDelegation(context, initializer, asNode(declarator["id"]));
    },
  }),
  meta: {
    docs: {
      description:
        "Disallow named functions that only delegate directly to another call.",
      recommended: false,
      url: "https://github.com/parloti/eslint-plugin/blob/main/docs/rules/no-useless-delegation.md",
    },
    messages: {
      uselessDelegation:
        "This function only delegates to another call; remove the wrapper or call the target directly.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { noUselessDelegationRule };
