import config from "@codeperfect/commitlint-config-emoji";

interface ReleaseConfig {
  branches: string[];
  plugins: ([string, unknown] | string)[];
}

/**
 * Semantic-release loads this file before build output exists, so the parser
 * behavior is intentionally duplicated here instead of importing from src/.
 */
const releaseConfig = {
  branches: ["main"],
  plugins: [
    ["@semantic-release/commit-analyzer", config.parserPreset],
    ["@semantic-release/release-notes-generator", config.parserPreset],
    "@semantic-release/npm",
    "@semantic-release/github",
  ],
} satisfies ReleaseConfig;

export default releaseConfig;
