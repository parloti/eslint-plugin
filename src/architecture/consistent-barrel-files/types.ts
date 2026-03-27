/** Type definition for rule data. */
interface BarrelFilesExportsOnlyOptions {
  /** AllowedBarrelNames helper value. */
  allowedBarrelNames?: string[];
}

/** Type definition for rule data. */
interface ConsistentBarrelFilesOptions {
  /** AllowedNames helper value. */
  allowedNames?: string[];

  /** Enforce helper value. */
  enforce?: boolean;
}

/** Type definition for rule data. */
interface NoReexportsOutsideBarrelsOptions {
  /** AllowedBarrelNames helper value. */
  allowedBarrelNames?: string[];
}

export type {
  BarrelFilesExportsOnlyOptions,
  ConsistentBarrelFilesOptions,
  NoReexportsOutsideBarrelsOptions,
};
