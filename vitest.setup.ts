import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * A utility type that makes all properties of a type optional, including nested properties, and preserves function types.
 * @template T - The type to make partial.
 * @example
 * ```typescript
 * type PartialModule = DeepMockPartial<Module>;
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TypeScript will struggle to infer the correct function type.
type DeepMockPartial<T> = T extends Function
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepMockPartial<T[K]> }
    : T;

/**
 * A utility type that makes all properties of a type optional, including nested properties.
 * @template T - The type to make partial.
 * @example
 * ```typescript
 * type PartialConfig = DeepPartial<Config>;
 * ```
 */
type DeepPartial<T> = T extends (...arguments_: unknown[]) => unknown
  ? T
  : T extends abstract new (...arguments_: unknown[]) => unknown
    ? T
    : T extends object
      ? { [P in keyof T]?: DeepPartial<T[P]> }
      : T;

/**
 * Creates a mock proxy that throws an error when accessing unmocked properties.
 * @template T - The type of the target object.
 * @param overrides The properties to override on the target object.
 * @returns A proxy object that behaves like the target object with the specified overrides.
 * @example
 * ```typescript
 * vi.mock(import("../module-path"),
 *   createMockProxy({
 *     mocked: () => vi.fn(),
 *     value: 10,
 *   }),
 * );
 * ```
 */
const mockProxyFactory =
  <TModule extends object>(
    overrides: DeepMockPartial<TModule>,
  ): (() => TModule) =>
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

/**
 * A helper function to create a mock class instance with specified method overrides.
 * @template T - The type of the class instance to mock.
 * @param overrides The methods and properties to override on the class instance.
 * @returns A proxy object that behaves like an instance of the class with the specified overrides.
 * @example
 * ```typescript
 * const mockInstance = mockClassInstance<SomeClass>({
 *   someMethod: () => vi.fn(),
 * });
 * ```
 */
const mockClassInstanceFactory = <T extends object>(
  overrides: DeepPartial<T>,
): T =>
  new Proxy(overrides as T, {
    get(target, property): T[keyof T] | undefined {
      if (property in target) {
        return target[property as keyof T];
      }

      throw new Error(
        `Attempted to access unmocked property: ${String(property)}`,
      );
    },
  });

/**
 * A helper function to create a mock class with specified method overrides.
 * @template TInstance - The type of the class instance to.
 * @param overrides The methods and properties to override on the class instance.
 * @returns A class constructor that creates instances with the specified overrides.
 * @example
 * ```typescript
 * const MockedClass = mockClass<SomeClass>({
 *   someMethod: () => vi.fn(),
 * });
 * const instance = new MockedClass();
 * ```
 */
const mockClassFactory = <TInstance extends object>(
  overrides: DeepPartial<TInstance>,
): new (...arguments_: unknown[]) => TInstance => {
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  return class {
    constructor() {
      return mockClassInstance(overrides);
    }
  } as new (...arguments_: unknown[]) => TInstance;
};

Object.defineProperty(globalThis, "createMockProxy", {
  configurable: false,
  value: mockProxyFactory,
  writable: false,
});
Object.defineProperty(globalThis, "mockClassInstance", {
  configurable: false,
  value: mockClassInstanceFactory,
  writable: false,
});
Object.defineProperty(globalThis, "mockClass", {
  configurable: false,
  value: mockClassFactory,
  writable: false,
});

declare global {
  var createMockProxy: typeof mockProxyFactory;
  var mockClassInstance: typeof mockClassInstanceFactory;
  var mockClass: typeof mockClassFactory;
}
