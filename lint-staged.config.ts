import type { Configuration } from "lint-staged";

export default {
  "!*.{css,scss,sass,htm,html,js,ts}": "npm run prettier:write --if-present",
  "*.{css,scss,sass}": [
    "npm run prettier:write --if-present",
    "npm run stylelint:fix --if-present",
  ],
  "*.{htm,html,js,ts}": "npm run lint:fix --if-present",
} satisfies Configuration;
