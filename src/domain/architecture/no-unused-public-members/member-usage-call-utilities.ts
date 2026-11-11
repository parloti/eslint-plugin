import * as ts from "typescript";

const resolvedCallSignatures = new WeakMap<
  ts.TypeChecker,
  WeakMap<ts.CallExpression, ts.Signature | undefined>
>();

/**
 * Gets a call's resolved signature once for a checker and source node.
 * @param call Call expression being checked.
 * @param checker TypeScript type checker.
 * @returns Resolved signature, when TypeScript can find one.
 * @example
 * ```typescript
 * const signature = getResolvedCallSignature(call, checker);
 * ```
 */
const getResolvedCallSignature = (
  call: ts.CallExpression,
  checker: ts.TypeChecker,
): ts.Signature | undefined => {
  let signatures = resolvedCallSignatures.get(checker);

  if (signatures === void 0) {
    signatures = new WeakMap();
    resolvedCallSignatures.set(checker, signatures);
  }

  if (signatures.has(call)) {
    return signatures.get(call);
  }

  const signature = checker.getResolvedSignature(call);
  signatures.set(call, signature);

  return signature;
};

/**
 * Gets the declaration selected for a resolved call.
 * @param call Call expression being checked.
 * @param checker TypeScript type checker.
 * @returns Selected signature declaration, when available.
 * @example
 * ```typescript
 * const declaration = getResolvedCallDeclaration(call, checker);
 * ```
 */
const getResolvedCallDeclaration = (
  call: ts.CallExpression,
  checker: ts.TypeChecker,
): ts.SignatureDeclaration | undefined =>
  getResolvedCallSignature(call, checker)?.getDeclaration();

export { getResolvedCallDeclaration, getResolvedCallSignature };
