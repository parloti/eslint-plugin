/** Commit type emojis recognized by the release parser. */
const commitTypeEmojis = [
  "✨",
  "🐛",
  "📚",
  "💎",
  "📦",
  "🚀",
  "🚨",
  "🛠",
  "⚙️",
  "♻️",
  "🗑",
];

/** Regex fragment that matches any supported commit emoji. */
const emojiRegexPart = commitTypeEmojis.map((emoji) => emoji.trim()).join("|");

/** Literal semantic-release tag format used for published versions. */
const versionTagFormat = ["v$", "{version}"].join("");

/** Parser options shared by semantic-release conventional commit plugins. */
const parserOptions = {
  breakingHeaderPattern: new RegExp(
    String.raw`^(?:${emojiRegexPart})\s+(\w*)(?:\((.*)\))?!:\s+(.*)$`,
    "u",
  ),
  headerCorrespondence: ["type", "scope", "subject"],
  headerPattern: new RegExp(
    String.raw`^(?:${emojiRegexPart})\s+(\w*)(?:\((.*)\))?!?:\s+(.*)$`,
    "u",
  ),
};

/** Semantic-release configuration for publishing this package. */
const releaseConfig = {
  branches: ["master", "main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      { parserOpts: parserOptions, preset: "conventionalcommits" },
    ],
    [
      "@semantic-release/release-notes-generator",
      { parserOpts: parserOptions, preset: "conventionalcommits" },
    ],
    ["@semantic-release/npm", { npmPublish: true }],
    "@semantic-release/github",
  ],
  tagFormat: versionTagFormat,
};

export default releaseConfig;
