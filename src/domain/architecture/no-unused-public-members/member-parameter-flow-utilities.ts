import * as ts from "typescript";

import type { LocalFunction } from "./member-function-utilities";
import type { MemberAnalysisScope } from "./member-scope-utilities";

import { completeFlow } from "./member-flow-graph-utilities";
import { getFunctionFacts, hasFunctionBody } from "./member-function-utilities";
import { isOpaqueRequestBodyHandoff } from "./member-request-body-utilities";
import { getResolvedCallDeclaration } from "./member-usage-call-utilities";
import { expressionReferencesSymbol } from "./member-usage-expression-reference-utilities";
import { isStandardJsonStringifyCall } from "./member-usage-whole-object-utilities";

interface Parameter {
  declaration: LocalFunction;
  symbol: ts.Symbol;
}

interface ParameterAnalysis {
  completed: WeakMap<Parameter, boolean>;
  parameters: WeakMap<ts.Symbol, Parameter>;
}

const serializedParameters = new WeakMap<
  MemberAnalysisScope,
  ParameterAnalysis
>();
const transmittedParameters = new WeakMap<
  MemberAnalysisScope,
  ParameterAnalysis
>();
const parameterSymbols = new WeakMap<
  ts.TypeChecker,
  WeakMap<ts.ParameterDeclaration, ts.Symbol | undefined>
>();

/**
 * Resolves the identifier parameter receiving a call argument.
 * @param declaration Resolved callee.
 * @param argumentIndex Argument position, including existing rest handling.
 * @param checker Active semantic checker.
 * @returns Parameter symbol when supported.
 * @example
 * ```typescript
 * const parameter = getCallParameterSymbol(declaration, index, checker);
 * ```
 */
const getCallParameterSymbol = (
  declaration: ts.SignatureDeclaration,
  argumentIndex: number,
  checker: ts.TypeChecker,
): ts.Symbol | undefined => {
  const parameter =
    declaration.parameters[
      Math.min(argumentIndex, declaration.parameters.length - 1)
    ];
  if (parameter === void 0 || !ts.isIdentifier(parameter.name)) {
    return void 0;
  }
  let symbols = parameterSymbols.get(checker);
  if (symbols === void 0) {
    symbols = new WeakMap();
    parameterSymbols.set(checker, symbols);
  }
  if (!symbols.has(parameter)) {
    symbols.set(parameter, checker.getSymbolAtLocation(parameter.name));
  }
  return symbols.get(parameter);
};

const getParameter = (
  analysis: ParameterAnalysis,
  declaration: LocalFunction,
  symbol: ts.Symbol,
): Parameter => {
  let parameter = analysis.parameters.get(symbol);
  if (parameter === void 0) {
    parameter = { declaration, symbol };
    analysis.parameters.set(symbol, parameter);
  }
  return parameter;
};

const parameterReachesSink = (
  declaration: LocalFunction,
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
  scope: MemberAnalysisScope,
  cache: WeakMap<MemberAnalysisScope, ParameterAnalysis>,
  getCalls: (declaration: LocalFunction) => readonly ts.CallExpression[],
  isSink: (call: ts.CallExpression, symbol: ts.Symbol) => boolean,
): boolean => {
  let analysis = cache.get(scope);
  if (analysis === void 0) {
    analysis = { completed: new WeakMap(), parameters: new WeakMap() };
    cache.set(scope, analysis);
  }
  const index = analysis;
  return completeFlow(
    getParameter(index, declaration, symbol),
    index.completed,
    (parameter) => {
      const calls = getCalls(parameter.declaration);
      if (calls.some((call) => isSink(call, parameter.symbol))) {
        return { dependencies: [], used: true };
      }
      const dependencies: Parameter[] = [];
      for (const call of calls) {
        const target = getResolvedCallDeclaration(call, checker);
        if (
          !hasFunctionBody(target) ||
          !scope.sourceFiles.has(target.getSourceFile())
        ) {
          continue;
        }
        for (const [argumentIndex, argument] of call.arguments.entries()) {
          if (
            !expressionReferencesSymbol(
              argument,
              parameter.symbol,
              checker,
              new Set(),
              scope,
            )
          ) {
            continue;
          }
          const forwarded = getCallParameterSymbol(
            target,
            argumentIndex,
            checker,
          );
          if (forwarded !== void 0) {
            dependencies.push(getParameter(index, target, forwarded));
          }
        }
      }
      return { dependencies, used: false };
    },
  );
};

/**
 * Completes local JSON forwarding for a parameter, including recursive groups.
 * @param declaration Local implementation.
 * @param symbol Traced parameter.
 * @param checker Active semantic checker.
 * @param program Program used to recognize the standard serializer.
 * @param scope Eligible production implementations.
 * @returns Whether standard unfiltered serialization consumes the parameter.
 * @example
 * ```typescript
 * const used = isParameterSerialized(declaration, symbol, checker, program, scope);
 * ```
 */
const isParameterSerialized = (
  declaration: LocalFunction,
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
  program: ts.Program,
  scope: MemberAnalysisScope,
): boolean =>
  parameterReachesSink(
    declaration,
    symbol,
    checker,
    scope,
    serializedParameters,
    (implementation) =>
      ts.isBlock(implementation.body)
        ? getFunctionFacts(implementation).calls
        : [],
    (call, parameter) =>
      isStandardJsonStringifyCall(call, checker, program) &&
      call.arguments.length === 1 &&
      call.arguments[0] !== void 0 &&
      expressionReferencesSymbol(
        call.arguments[0],
        parameter,
        checker,
        new Set(),
        scope,
      ),
  );

/**
 * Completes local parameter forwarding into declaration-only opaque HTTP bodies.
 * @param declaration Local implementation.
 * @param symbol Traced parameter.
 * @param checker Active semantic checker.
 * @param scope Eligible production implementations.
 * @returns Whether an opaque request body consumes the parameter.
 * @example
 * ```typescript
 * const used = isParameterTransmitted(declaration, symbol, checker, scope);
 * ```
 */
const isParameterTransmitted = (
  declaration: LocalFunction,
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
  scope: MemberAnalysisScope,
): boolean =>
  parameterReachesSink(
    declaration,
    symbol,
    checker,
    scope,
    transmittedParameters,
    (implementation) => getFunctionFacts(implementation).allCalls,
    (call, parameter) =>
      isOpaqueRequestBodyHandoff(call, parameter, checker, scope),
  );

export {
  getCallParameterSymbol,
  isParameterSerialized,
  isParameterTransmitted,
};
