/** Type definition for rule data. */
interface BarrelFilesExportsOnlyOptions {
  /** Folders helper value. */
  folders?: string | string[];

  /** Names helper value. */
  names?: string | string[];
}

/** Type definition for rule data. */
interface ConsistentBarrelFilesOptions {
  /** Enforce helper value. */
  enforce?: boolean;

  /** Folders helper value. */
  folders?: string | string[];

  /** Names helper value. */
  names?: string | string[];
}

/** Type definition for rule data. */
interface NoReexportsOutsideBarrelsOptions {
  /** Folders helper value. */
  folders?: string | string[];

  /** Names helper value. */
  names?: string | string[];
}

export type {
  BarrelFilesExportsOnlyOptions,
  ConsistentBarrelFilesOptions,
  NoReexportsOutsideBarrelsOptions,
};
