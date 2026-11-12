import { describe, expect, it, vi } from "vitest";

import { completeFlow } from "./member-flow-graph-utilities";

interface FlowPosition {
  index: number;
}

const DEEP_CHAIN = Array.from({ length: 10_000 }, (_, index) => ({ index }));

describe("completed local-flow groups", () => {
  it.each([false, true])(
    "propagates exits through cycles with reversed branches %s",
    (reverse) => {
      // Arrange
      const root = {};
      const a = {};
      const b = {};
      const exit = {};
      const dead = {};
      const loop = {};
      const graph = new Map([
        [a, { dependencies: [b, exit], used: false }],
        [b, { dependencies: [a], used: false }],
        [dead, { dependencies: [loop], used: false }],
        [exit, { dependencies: [], used: true }],
        [loop, { dependencies: [dead], used: false }],
        [root, { dependencies: reverse ? [dead, a] : [a, dead], used: false }],
      ]);
      const completed = new WeakMap<object, boolean>();
      const inspect = vi.fn((node: object) => {
        const facts = graph.get(node);
        if (facts === void 0) {
          throw new Error("Missing flow fixture node");
        }
        return facts;
      });

      // Act
      const actual = [
        completeFlow(root, completed, inspect),
        completeFlow(b, completed, inspect),
        completeFlow(dead, completed, inspect),
      ];

      // Assert
      expect(actual).toStrictEqual([true, true, false]);
      expect([a, b, exit].map((node) => completed.get(node))).toStrictEqual([
        true,
        true,
        true,
      ]);
      expect(completed.get(loop)).toBe(false);
      expect(inspect).toHaveBeenCalledTimes(6);
    },
  );

  it("completes deep chains without recursive calls and reuses a completed dependency", () => {
    // Arrange
    const root = DEEP_CHAIN[0];
    if (root === void 0) {
      throw new Error("Missing deep flow fixture root");
    }
    const completed = new WeakMap<FlowPosition, boolean>();
    const inspect = vi.fn(({ index }: FlowPosition) => {
      const next = DEEP_CHAIN[index + 1];
      return {
        dependencies: next === void 0 ? [] : [next],
        used: next === void 0,
      };
    });
    const consumer = { index: -1 };

    // Act
    const actual = [
      completeFlow(root, completed, inspect),
      completeFlow(consumer, completed, inspect),
    ];

    // Assert
    expect(actual).toStrictEqual([true, true]);
    expect(inspect).toHaveBeenCalledTimes(10_001);
  });

  it("does not finalize an unfinished traversal when discovering dependencies fails", () => {
    // Arrange
    const root = {};
    const dependency = {};
    const completed = new WeakMap<object, boolean>();
    const fail = (node: object) => {
      if (node === dependency) {
        throw new Error("Interrupted local-flow discovery");
      }
      return { dependencies: [dependency], used: false };
    };

    // Act
    const actual = () => completeFlow(root, completed, fail);

    // Assert
    expect(actual).toThrow("Interrupted local-flow discovery");
    expect(completed.get(root)).toBeUndefined();
    expect(completed.get(dependency)).toBeUndefined();
  });
});
