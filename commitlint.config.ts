import type { ParserPreset, UserConfig } from "@commitlint/types";

import _default from "@commitlint/config-conventional";
import createPreset from "conventional-changelog-conventionalcommits";

/** Commit type metadata from the conventional config prompt. */
const conventionalEnums = _default.prompt.questions.type.enum;

/** Parser options wrapper used by conventional presets. */
interface ParserOptions {
  /** Parser options used by conventional presets. */
  parserOpts: ParserPreset["parserOpts"];
}

/** Parser preset shape that can include conventional parser options. */
type ParserPresetWithConventional = ParserPreset & {
  /** Optional conventional changelog parser options. */
  conventionalChangelog?: ParserOptions;
  /** Optional recommended bump parser options. */
  recommendedBumpOpts?: ParserOptions;
};

/**
 * Build a parser preset with emoji-aware commit headers.
 * @returns Emoji-aware parser preset configuration.
 * @example
 * ```typescript
 * const preset = await createEmojiParser();
 * const config = { parserPreset: preset };
 * ```
 */
const createEmojiParser = async (): Promise<ParserPresetWithConventional> => {
  const emojiRegexPart = Object.values(conventionalEnums)
    .map((value) => value.emoji.trim())
    .join("|");

  const parserOptions = {
    breakingHeaderPattern: new RegExp(
      String.raw`^(?:${emojiRegexPart})\s+(\w*)(?:\((.*)\))?!:\s+(.*)$`,
      "u",
    ),
    headerPattern: new RegExp(
      String.raw`^(?:${emojiRegexPart})\s+(\w*)(?:\((.*)\))?!?:\s+(.*)$`,
      "u",
    ),
  };

  const baseParserPreset = (await createPreset()) as ParserPreset;
  return {
    ...baseParserPreset,
    conventionalChangelog: { parserOpts: parserOptions },
    parserOpts: parserOptions,
    recommendedBumpOpts: { parserOpts: parserOptions },
  };
};

/** Emoji-aware parser preset used by commitlint. */
const emojiParser = await createEmojiParser();
export default {
  extends: ["@commitlint/config-conventional"],
  parserPreset: emojiParser,
  prompt: {
    questions: {
      type: {
        emojiInHeader: true,
        enum: {
          build: { emoji: `${conventionalEnums.build.emoji} ` },
          chore: { emoji: `${conventionalEnums.chore.emoji} ` },
          ci: { emoji: `${conventionalEnums.ci.emoji} ` },
          revert: { emoji: `${conventionalEnums.revert.emoji} ` },
        },
      },
    },
  },
} satisfies UserConfig;
