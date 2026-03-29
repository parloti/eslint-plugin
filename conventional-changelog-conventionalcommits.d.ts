declare module "conventional-changelog-conventionalcommits" {
  import type { ParserPreset } from "@commitlint/types";

  export default function createPreset(): Promise<ParserPreset>;
}
