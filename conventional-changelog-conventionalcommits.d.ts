declare module "conventional-changelog-conventionalcommits" {
  /** Conventional changelog preset shape. */
  type ConventionalChangelogPreset = Record<string, unknown>;

  /** Builds the conventional changelog preset. */
  const createPreset: () => Promise<ConventionalChangelogPreset>;

  export default createPreset;
}
