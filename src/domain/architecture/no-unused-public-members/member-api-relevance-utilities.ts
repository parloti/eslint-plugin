import * as ts from "typescript";

import { resolveCanonicalSymbol } from "../no-unused-exports/no-unused-exports-symbol-utilities";
import { getGlobalSourceFiles } from "../program-analysis";
import { canSourceReachMember } from "./member-api-reachability-utilities";
import { completeFlow } from "./member-flow-graph-utilities";

interface CandidateRelevance {
  ambient: boolean;
  declarations: Set<ts.Node>;
  symbols: WeakMap<ts.Symbol, boolean>;
  types: WeakMap<ts.Type, boolean>;
}

interface SymbolDependencies {
  dependencies: ts.Symbol[];
  used: boolean;
}

const candidates = new WeakMap<
  ts.Program,
  WeakMap<ts.Symbol, CandidateRelevance>
>();

const containsNode = (root: ts.Node, node: ts.Node): boolean => {
  let current = node;
  while (!ts.isSourceFile(current)) {
    if (current === root) {
      return true;
    }
    current = current.parent;
  }
  return false;
};

const isDeclarationName = (node: ts.Node): boolean => {
  const { parent } = node;
  return (
    !ts.isShorthandPropertyAssignment(parent) &&
    "name" in parent &&
    parent.name === node
  );
};

const getDeclarationDependencies = (
  declaration: ts.Declaration,
  declarations: Set<ts.Node>,
  checker: ts.TypeChecker,
): SymbolDependencies => {
  const dependencies = new Set<ts.Symbol>();
  const pending: ts.Node[] = [declaration];
  while (pending.length > 0) {
    const node = pending.pop();
    if (node === void 0) {
      break;
    }
    if (declarations.has(node)) {
      return { dependencies: [], used: true };
    }
    ts.forEachChild(node, (child) => {
      pending.push(child);
    });
    if (
      (!ts.isIdentifier(node) && !ts.isStringLiteralLike(node)) ||
      isDeclarationName(node)
    ) {
      continue;
    }
    const referenced = ts.isShorthandPropertyAssignment(node.parent)
      ? checker.getShorthandAssignmentValueSymbol(node.parent)
      : checker.getSymbolAtLocation(node);
    if (referenced === void 0) {
      return { dependencies: [], used: true };
    }
    const canonical = resolveCanonicalSymbol(referenced, checker);
    if ((canonical.flags & ts.SymbolFlags.TypeParameter) === 0) {
      dependencies.add(canonical);
    } else {
      const parameters = canonical.declarations;
      // Captured parameters have substitutions unavailable on anonymous types.
      if (
        parameters === void 0 ||
        parameters.length === 0 ||
        parameters.some((parameter) => !containsNode(declaration, parameter))
      ) {
        return { dependencies: [], used: true };
      }
    }
  }
  return { dependencies: [...dependencies], used: false };
};

const getSymbolDependencies = (
  symbol: ts.Symbol,
  target: ts.Symbol,
  facts: CandidateRelevance,
  program: ts.Program,
): SymbolDependencies => {
  const declarations = symbol.declarations ?? [];
  const summaries = declarations
    .filter((declaration) =>
      canSourceReachMember(declaration.getSourceFile(), target, program),
    )
    .map((declaration) =>
      getDeclarationDependencies(
        declaration,
        facts.declarations,
        program.getTypeChecker(),
      ),
    );
  return {
    dependencies: summaries.flatMap((summary) => summary.dependencies),
    used:
      declarations.length === 0 || summaries.some((summary) => summary.used),
  };
};

const getCandidateRelevance = (
  program: ts.Program,
  target: ts.Symbol,
): CandidateRelevance => {
  let byMember = candidates.get(program);
  if (byMember === void 0) {
    byMember = new WeakMap();
    candidates.set(program, byMember);
  }
  let facts = byMember.get(target);
  if (facts === void 0) {
    const global = getGlobalSourceFiles(program)[0];
    facts = {
      ambient:
        global !== void 0 && canSourceReachMember(global, target, program),
      declarations: new Set(target.declarations),
      symbols: new WeakMap(),
      types: new WeakMap(),
    };
    byMember.set(target, facts);
  }
  return facts;
};

/**
 * Conservatively checks whether a type can carry a candidate declaration.
 * @param type Type awaiting semantic expansion.
 * @param target Candidate member symbol.
 * @param program Program owning symbols and substitutions.
 * @returns False only when declarations and visible arguments exclude the member.
 * @example
 * ```typescript
 * const relevant = canTypeContainMember(type, memberSymbol, program);
 * ```
 */
const canTypeContainMember = (
  type: ts.Type,
  target: ts.Symbol,
  program: ts.Program,
): boolean => {
  const checker = program.getTypeChecker();
  const facts = getCandidateRelevance(program, target);
  // Primitive syntax and inferred values can expose augmented global types.
  if (facts.ambient || facts.declarations.size === 0) {
    return true;
  }
  return completeFlow(type, facts.types, (current) => {
    if (current.isUnionOrIntersection()) {
      return { dependencies: current.types, used: false };
    }
    if (
      (current.flags &
        (ts.TypeFlags.Any |
          ts.TypeFlags.Unknown |
          ts.TypeFlags.Never |
          ts.TypeFlags.Void |
          ts.TypeFlags.Undefined |
          ts.TypeFlags.Null)) !==
      0
    ) {
      return { dependencies: [], used: false };
    }
    if ((current.flags & ts.TypeFlags.TypeParameter) !== 0) {
      const constraint = checker.getBaseConstraintOfType(current);
      return {
        dependencies: constraint === void 0 ? [] : [constraint],
        used: false,
      };
    }
    if (
      (current.flags &
        (ts.TypeFlags.Conditional |
          ts.TypeFlags.IndexedAccess |
          ts.TypeFlags.Index |
          ts.TypeFlags.Substitution |
          ts.TypeFlags.StringMapping |
          ts.TypeFlags.TemplateLiteral)) !==
      0
    ) {
      return { dependencies: [], used: true };
    }
    const object =
      (current.flags & ts.TypeFlags.Object) === 0
        ? void 0
        : (current as ts.ObjectType);
    const reference =
      object === void 0 || (object.objectFlags & ts.ObjectFlags.Reference) === 0
        ? void 0
        : (object as ts.TypeReference);
    if (
      reference === void 0 &&
      object !== void 0 &&
      ((object.objectFlags & ts.ObjectFlags.Instantiated) !== 0 ||
        checker.getSignaturesOfType(current, ts.SignatureKind.Call).length >
          0 ||
        checker.getSignaturesOfType(current, ts.SignatureKind.Construct)
          .length > 0)
    ) {
      return { dependencies: [], used: true };
    }
    const symbol =
      current.getSymbol() ?? checker.getApparentType(current).getSymbol();
    const symbols = [symbol, current.aliasSymbol].filter(
      (entry) => entry !== void 0,
    );
    const used =
      symbols.length === 0 ||
      symbols.some((entry) =>
        completeFlow(
          resolveCanonicalSymbol(entry, checker),
          facts.symbols,
          (dependency) =>
            getSymbolDependencies(dependency, target, facts, program),
        ),
      );
    if (used) {
      return { dependencies: [], used: true };
    }
    return {
      dependencies: [
        ...(reference === void 0 ? [] : checker.getTypeArguments(reference)),
        ...(current.aliasTypeArguments ?? []),
      ],
      used: false,
    };
  });
};

export { canTypeContainMember };
