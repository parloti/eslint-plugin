import type { Configuration } from "lint-staged";

export default {
  "!*.{css,scss,sass,htm,html,js,ts}": [
    "npx --yes prettier --ignore-unknown --write",
    [],
  ],
  "*.{css,scss,sass}": [
    "npx --yes prettier --ignore-unknown --write",
    [],
    "npx --yes stylelint --max-warnings=0 --fix ",
    [],
  ],
  "*.{htm,html,js,ts}": [
    "npx --yes prettier --ignore-unknown --write",
    [],
    "npx --yes eslint --no-warn-ignored --fix",
    [],
  ],
} satisfies Configuration;
