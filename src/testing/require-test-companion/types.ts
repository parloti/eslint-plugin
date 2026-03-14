/** Type definition for rule data. */
interface RequireTestCompanionOptions {
  /** EnforceIn helper value. */
  enforceIn?: string | string[];

  /** IgnorePatterns helper value. */
  ignorePatterns?: string | string[];

  /** TestSuffixes helper value. */
  testSuffixes?: string | string[];
}

export type { RequireTestCompanionOptions };
