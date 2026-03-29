import { writeFileSync } from "node:fs";

/**
 * Writes a barrel file fixture.
 * @param filePath File path for the barrel fixture.
 * @example
 * ```typescript
 * writeBarrel("/tmp/index.ts");
 * ```
 */
const writeBarrel = (filePath: string): void => {
  writeFileSync(filePath, "export * from './feature';", "utf8");
};

/**
 * Writes a feature file fixture.
 * @param filePath File path for the feature fixture.
 * @example
 * ```typescript
 * writeFeature("/tmp/feature.ts");
 * ```
 */
const writeFeature = (filePath: string): void => {
  writeFileSync(filePath, "export const feature = 1;", "utf8");
};

export { writeBarrel, writeFeature };
