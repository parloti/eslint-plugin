import * as ts from "typescript";

interface FunctionFacts {
  allCalls: readonly ts.CallExpression[];
  calls: readonly ts.CallExpression[];
  returns: readonly ts.Expression[];
}

type LocalFunction = ts.SignatureDeclaration & { body: ts.ConciseBody };

const functionFacts = new WeakMap<LocalFunction, FunctionFacts>();

/**
 * Narrows a signature to an implementation with a block or expression body.
 * @param declaration Resolved signature declaration.
 * @returns Whether the signature has an implementation.
 * @example
 * ```typescript
 * if (hasFunctionBody(declaration)) inspect(declaration.body);
 * ```
 */
const hasFunctionBody = (
  declaration: ts.SignatureDeclaration | undefined,
): declaration is LocalFunction =>
  declaration !== void 0 &&
  "body" in declaration &&
  declaration.body !== void 0;

/**
 * Catalogs function calls and returns once without resolving types or signatures.
 * @param declaration Function implementation in an immutable syntax snapshot.
 * @returns Own calls/returns and calls including nested closures.
 * @example
 * ```typescript
 * const facts = getFunctionFacts(declaration);
 * ```
 */
const getFunctionFacts = (declaration: LocalFunction): FunctionFacts => {
  const cached = functionFacts.get(declaration);
  if (cached !== void 0) {
    return cached;
  }
  const calls: ts.CallExpression[] = [];
  const allCalls: ts.CallExpression[] = [];
  const returns: ts.Expression[] = ts.isBlock(declaration.body)
    ? []
    : [declaration.body];
  const pending: { nested: boolean; node: ts.Node }[] = [
    { nested: false, node: declaration.body },
  ];
  while (pending.length > 0) {
    const frame = pending.pop();
    if (frame === void 0) {
      break;
    }
    const nested = frame.nested || ts.isFunctionLike(frame.node);
    if (ts.isCallExpression(frame.node)) {
      allCalls.push(frame.node);
      if (!nested) {
        calls.push(frame.node);
      }
    }
    if (
      !nested &&
      ts.isReturnStatement(frame.node) &&
      frame.node.expression !== void 0
    ) {
      returns.push(frame.node.expression);
    }
    ts.forEachChild(frame.node, (node) => {
      pending.push({ nested, node });
    });
  }
  const facts = { allCalls, calls, returns };
  functionFacts.set(declaration, facts);
  return facts;
};

export { getFunctionFacts, hasFunctionBody };
export type { LocalFunction };
