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

const emojiRegexPart = commitTypeEmojis.map((emoji) => emoji.trim()).join("|");

const parserOpts = {
  breakingHeaderPattern: new RegExp(
    String.raw`^(?:${emojiRegexPart})\s+(\w*)(?:\((.*)\))?!:\s+(.*)$`,
    "u",
  ),
  headerPattern: new RegExp(
    String.raw`^(?:${emojiRegexPart})\s+(\w*)(?:\((.*)\))?!?:\s+(.*)$`,
    "u",
  ),
  headerCorrespondence: ["type", "scope", "subject"],
};

export default {
  branches: ["master", "main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      { parserOpts, preset: "conventionalcommits" },
    ],
    [
      "@semantic-release/release-notes-generator",
      { parserOpts, preset: "conventionalcommits" },
    ],
    ["@semantic-release/npm", { npmPublish: true }],
    "@semantic-release/github",
  ],
  tagFormat: "v${version}",
};
