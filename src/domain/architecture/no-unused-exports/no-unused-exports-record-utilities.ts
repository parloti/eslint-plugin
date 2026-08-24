/**
 * Converts one unknown value into an indexable record.
 * @param value Candidate value.
 * @returns Record view when the value is object-like.
 * @example
 * ```typescript
 * const record = asRecord({ type: "Identifier" });
 * ```
 */
const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : void 0;

/**
 * Reads one array property from an object-like value.
 * @param value Candidate object.
 * @param key Lookup key used to read the property.
 * @returns Array value when present.
 * @example
 * ```typescript
 * const items = readArrayProperty({ elements: [1, 2] }, "elements");
 * ```
 */
const readArrayProperty = (
  value: unknown,
  key: string,
): undefined | unknown[] => {
  const record = asRecord(value);
  const property = record?.[key];
  return Array.isArray(property) ? property : void 0;
};

/**
 * Reads one string property from an object-like value.
 * @param value Candidate object.
 * @param key Lookup key used to read the property.
 * @returns String value when present.
 * @example
 * ```typescript
 * const name = readStringProperty({ name: "feature" }, "name");
 * ```
 */
const readStringProperty = (
  value: unknown,
  key: string,
): string | undefined => {
  const record = asRecord(value);
  const property = record?.[key];
  return typeof property === "string" ? property : void 0;
};

export { asRecord, readArrayProperty, readStringProperty };
