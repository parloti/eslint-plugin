/** Result of splitting a module specifier into path and suffix parts. */
export interface ModuleSpecifierParts {
  /** Specifier path before any query or fragment suffix. */
  pathPart: string;

  /** Query or fragment suffix preserved for fixes. */
  suffix: string;
}

/** Mutable collection used while flattening conditional package import values. */
export interface PackageImportTargetCollection {
  /** Whether a null branch was found. */
  hasNull: boolean;

  /** Whether an unsupported or invalid value was found. */
  invalid: boolean;

  /** Unique normalized targets found across all branches. */
  targets: Set<string>;
}

/** One package.json `imports` alias normalized for reverse path matching. */
export interface PackageSubpathImportAlias {
  /** Alias specifier prefix before `*`, or the complete exact alias. */
  aliasPrefix: string;

  /** Alias specifier suffix after `*`. */
  aliasSuffix: string;

  /** Whether the alias uses one `*` pattern segment. */
  isPattern: boolean;

  /** Package-relative target prefix before `*`. */
  targetPrefix: string;

  /** Package-relative target suffix after `*`. */
  targetSuffix: string;
}

/** Lazily loaded package context for one linted file. */
export interface PackageSubpathImportState {
  /** Package.json `imports` aliases sorted by specificity. */
  aliases: readonly PackageSubpathImportAlias[];

  /** Absolute directory containing the nearest package.json. */
  packageRoot: string;
}

/** Prefix and suffix around one wildcard in a package import pattern. */
export interface WildcardPatternParts {
  /** Text before the wildcard. */
  prefix: string;

  /** Text after the wildcard. */
  suffix: string;
}
