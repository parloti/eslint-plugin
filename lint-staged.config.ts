import type { Configuration } from "lint-staged";

export default {
  "!*.{css,scss,sass,htm,html,js,ts}":
    "npx --yes prettier --ignore-unknown --write",
  "*.{css,scss,sass}": [
    "npx --yes prettier --ignore-unknown --write",
    "npx --yes stylelint --fix --max-warnings=0",
  ],
  "*.{htm,html}": [
    "npx --yes htmlhint",
    "npx --yes prettier --ignore-unknown --write",
    "npx --yes eslint --max-warnings=0 --fix",
  ],
  "*.{js,ts}": [
    "npx --yes prettier --ignore-unknown --write",
    "npx --yes eslint --max-warnings=0 --fix",
  ],
} satisfies Configuration;
