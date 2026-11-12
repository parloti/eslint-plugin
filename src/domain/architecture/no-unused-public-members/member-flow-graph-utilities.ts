interface FlowFacts<Key> {
  dependencies: readonly Key[];
  used: boolean;
}

/**
 * Completes boolean reachability in dependency-first strongly connected groups.
 * @param root Requested flow state.
 * @param completed Previously completed results for the same immutable scope.
 * @param describe Direct consumption and outgoing dependencies for a state.
 * @returns Whether the state reaches consumption.
 * @example
 * ```typescript
 * const used = completeFlow(root, completed, describe);
 * ```
 */
const completeFlow = <Key extends object>(
  root: Key,
  completed: WeakMap<Key, boolean>,
  describe: (key: Key) => FlowFacts<Key>,
): boolean => {
  const cached = completed.get(root);
  if (cached !== void 0) {
    return cached;
  }
  const graph = new Map<Key, FlowFacts<Key>>();
  const parents = new Map<Key, Key[]>();
  const order: Key[] = [];
  const stack = [{ expanded: false, key: root }];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === void 0) {
      break;
    }
    if (frame.expanded) {
      order.push(frame.key);
      continue;
    }
    if (graph.has(frame.key) || completed.has(frame.key)) {
      continue;
    }
    const facts = describe(frame.key);
    graph.set(frame.key, facts);
    stack.push({ expanded: true, key: frame.key });
    for (const dependency of facts.dependencies) {
      const callers = parents.get(dependency) ?? [];
      callers.push(frame.key);
      parents.set(dependency, callers);
      stack.push({ expanded: false, key: dependency });
    }
  }

  const assigned = new Set<Key>();
  const groups: Key[][] = [];
  while (order.length > 0) {
    const key = order.pop();
    if (key === void 0) {
      break;
    }
    if (assigned.has(key)) {
      continue;
    }
    const group: Key[] = [];
    const pending = [key];
    while (pending.length > 0) {
      const current = pending.pop();
      if (current === void 0 || assigned.has(current)) {
        continue;
      }
      assigned.add(current);
      group.push(current);
      const callers = parents.get(current) ?? [];
      for (const parent of callers) {
        pending.push(parent);
      }
    }
    groups.push(group);
  }

  parents.clear();
  assigned.clear();
  while (groups.length > 0) {
    const group = groups.pop();
    if (group === void 0) {
      break;
    }
    const used = group.some((key) => {
      const facts = graph.get(key);
      if (facts === void 0) {
        throw new Error("Missing discovered member-flow state");
      }
      return (
        facts.used ||
        facts.dependencies.some(
          (dependency) => completed.get(dependency) === true,
        )
      );
    });
    for (const key of group) {
      completed.set(key, used);
      graph.delete(key);
    }
  }
  const result = completed.get(root);
  if (result === void 0) {
    throw new Error("Member-flow analysis did not complete its root");
  }
  return result;
};

export { completeFlow };
