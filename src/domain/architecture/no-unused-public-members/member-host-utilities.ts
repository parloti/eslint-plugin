import * as ts from "typescript";

/** One supported host and its direct member declarations. */
interface MemberHost {
  /** Members declared directly by this host. */
  members: readonly ts.Node[];

  /** Display name of the host. */
  name: string;

  /** Host declaration node. */
  node: ts.Node;

  /** Host symbol, when available. */
  symbol: ts.Symbol | undefined;
}

/**
 * Gets a static member name, excluding dynamic and private keys.
 * @param name Candidate declaration name.
 * @returns Static name or undefined when the key is dynamic or private.
 * @example
 * ```typescript
 * const name = getStaticMemberName(ts.factory.createIdentifier("run"));
 * ```
 */
const getStaticMemberName = (name: ts.Node | undefined): string | undefined => {
  if (
    name === void 0 ||
    ts.isPrivateIdentifier(name) ||
    ts.isComputedPropertyName(name)
  ) {
    return void 0;
  }

  return ts.isIdentifier(name) ||
    ts.isStringLiteralLike(name) ||
    ts.isNumericLiteral(name)
    ? name.text
    : void 0;
};

/**
 * Gets the local name used to identify a supported host.
 * @param node Host declaration.
 * @returns Host name or an anonymous marker.
 * @example
 * ```typescript
 * const name = getHostName(classDeclaration);
 * ```
 */
const getHostName = (node: ts.Node): string => {
  if (
    (ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node)) &&
    node.name !== void 0
  ) {
    return node.name.text;
  }

  return ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
    ? node.name.text
    : "<anonymous>";
};

/**
 * Resolves a direct object-literal property symbol before its contextual type.
 * @param checker TypeScript type checker.
 * @param member Member declaration.
 * @param memberName Static member name.
 * @param hostType Type of the containing host.
 * @returns Member symbol when TypeScript can resolve it.
 * @example
 * ```typescript
 * const symbol = getMemberSymbol(checker, property, "value", hostType);
 * ```
 */
const getMemberSymbol = (
  checker: ts.TypeChecker,
  member: ts.Node,
  memberName: string,
  hostType: ts.Type,
): ts.Symbol | undefined => {
  const nameNode = (member as ts.NamedDeclaration).name;
  const isObjectMember =
    ts.isPropertyAssignment(member) ||
    ts.isShorthandPropertyAssignment(member) ||
    ts.isMethodDeclaration(member) ||
    ts.isGetAccessorDeclaration(member) ||
    ts.isSetAccessorDeclaration(member);

  if (isObjectMember && ts.isObjectLiteralExpression(member.parent)) {
    const objectMember = checker.getPropertyOfType(
      checker.getTypeAtLocation(member.parent),
      memberName,
    );

    if (objectMember !== void 0) {
      return objectMember;
    }
  }

  const directSymbol =
    nameNode === void 0 ? void 0 : checker.getSymbolAtLocation(nameNode);

  return directSymbol ?? checker.getPropertyOfType(hostType, memberName);
};

/**
 * Unwraps supported expressions to find a direct object-literal initializer.
 * @param expression Variable initializer.
 * @returns Direct object literal or undefined.
 * @example
 * ```typescript
 * const object = getObjectLiteral(variable.initializer);
 * ```
 */
const getObjectLiteral = (
  expression: ts.Expression | undefined,
): ts.ObjectLiteralExpression | undefined => {
  if (expression === void 0) {
    return void 0;
  }

  if (ts.isObjectLiteralExpression(expression)) {
    return expression;
  }

  return ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isParenthesizedExpression(expression) ||
    ts.isNonNullExpression(expression)
    ? getObjectLiteral(expression.expression)
    : void 0;
};

/**
 * Checks whether a class member is public or has implicit public visibility.
 * @param member Class member declaration.
 * @returns True when the member is not private or protected.
 * @example
 * ```typescript
 * const visible = isPublicClassMember(classMethod);
 * ```
 */
const isPublicClassMember = (member: ts.Node): boolean => {
  const supportsVisibility =
    ts.isPropertyDeclaration(member) ||
    ts.isMethodDeclaration(member) ||
    ts.isGetAccessorDeclaration(member) ||
    ts.isSetAccessorDeclaration(member);

  if (!supportsVisibility) {
    return false;
  }

  const modifiers = ts.canHaveModifiers(member)
    ? (ts.getModifiers(member) ?? [])
    : [];

  return modifiers.every(
    (modifier) =>
      modifier.kind !== ts.SyntaxKind.PrivateKeyword &&
      modifier.kind !== ts.SyntaxKind.ProtectedKeyword,
  );
};

/**
 * Checks whether a node is a supported direct property or method.
 * @param member Candidate TypeScript member.
 * @returns True when this rule analyzes the member kind.
 * @example
 * ```typescript
 * const supported = isSupportedMember(typeMember);
 * ```
 */
const isSupportedMember = (member: ts.Node): boolean =>
  ts.isPropertyDeclaration(member) ||
  ts.isMethodDeclaration(member) ||
  ts.isGetAccessorDeclaration(member) ||
  ts.isSetAccessorDeclaration(member) ||
  ts.isPropertySignature(member) ||
  ts.isMethodSignature(member) ||
  ts.isPropertyAssignment(member) ||
  ts.isShorthandPropertyAssignment(member);

/**
 * Collects direct class, interface, type-alias, and const-object hosts.
 * @param sourceFile Source file to inspect.
 * @param checker TypeScript type checker.
 * @returns Supported hosts declared by the source file.
 * @example
 * ```typescript
 * const hosts = collectMemberHosts(sourceFile, checker);
 * ```
 */
const collectMemberHosts = (
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): MemberHost[] => {
  const hosts: MemberHost[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node)) {
      hosts.push({
        members: node.members,
        name: getHostName(node),
        node,
        symbol:
          node.name === void 0
            ? void 0
            : checker.getSymbolAtLocation(node.name),
      });
    } else if (ts.isInterfaceDeclaration(node)) {
      hosts.push({
        members: node.members,
        name: getHostName(node),
        node,
        symbol: checker.getSymbolAtLocation(node.name),
      });
    } else if (
      ts.isTypeAliasDeclaration(node) &&
      ts.isTypeLiteralNode(node.type)
    ) {
      hosts.push({
        members: node.type.members,
        name: getHostName(node),
        node,
        symbol: checker.getSymbolAtLocation(node.name),
      });
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      ts.isVariableDeclarationList(node.parent) &&
      (node.parent.flags & ts.NodeFlags.Const) !== 0
    ) {
      const objectLiteral = getObjectLiteral(node.initializer);

      if (objectLiteral !== void 0) {
        hosts.push({
          members: objectLiteral.properties,
          name: getHostName(node),
          node,
          symbol: checker.getSymbolAtLocation(node.name),
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return hosts;
};

export {
  collectMemberHosts,
  getMemberSymbol,
  getStaticMemberName,
  isPublicClassMember,
  isSupportedMember,
};
