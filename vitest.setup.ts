import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

/**
 * A utility type that makes all properties of a type optional, including nested properties.
 * @template T - The type to make partial.
 * @example
 * ```typescript
 * type PartialConfig = DeepPartial<Config>;
 * ```
 */
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Creates a mock proxy that throws an error when accessing unmocked properties.
 * @template T - The type of the target object.
 * @param overrides The properties to override on the target object.
 * @returns A proxy object that behaves like the target object with the specified overrides.
 * @example
 * ```typescript
 * vi.mock(
 *   ...createMockProxy(import("../aaa/analyzer.assertions.helpers"), {
 *     hasAssertion: (node: NodeFlags) => hasFlag(node, "containsAssertion"),
 *     isValidAssertStatement: (node: NodeFlags) => hasFlag(node, "isValidAssert"),
 *   }),
 * );
 * ```
 */
const mockProxyFactory =
  <TModule extends object>(overrides: DeepPartial<TModule>): (() => TModule) =>
  () =>
    new Proxy(overrides as TModule, {
      get: (object, property): TModule[keyof TModule] | undefined => {
        if (property === "then") {
          return void 0;
        }
        if (property in object) {
          return object[property as keyof TModule];
        }
        throw new Error(
          `Attempted to access unmocked property: ${String(property)}`,
        );
      },
    });

Object.defineProperty(globalThis, "createMockProxy", {
  configurable: false,
  value: mockProxyFactory,
  writable: false,
});

declare global {
  var createMockProxy: typeof mockProxyFactory;
}
