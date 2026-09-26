export interface TaskGroup {
  readonly commands?: readonly string[];
  readonly concurrent?: boolean;
  readonly groups?: readonly TaskGroup[];
  readonly name: string;
}

type TaskPlan = readonly TaskGroup[];

export const plans: Record<string, TaskPlan> = {
  build: [
    {
      commands: ["npm run clean", "npm run compile", "npm run resolve-paths"],
      name: "build",
    },
  ],
  "eslint:fix": [
    {
      commands: ["npm run check:rules", "npm run eslint -- --fix"],
      name: "check & fix",
    },
  ],
  lint: [
    { commands: ["npm run prettier"], name: "prettier" },
    { commands: ["npm run eslint"], name: "eslint" },
  ],
  "lint:fix": [
    {
      commands: ["npm run fmt"],
      groups: [
        {
          commands: ["npm run check:rules", "npm run eslint -- --fix"],
          name: "check & fix",
        },
      ],
      name: "format & fix",
    },
  ],
  "test:all": [
    { commands: ["npm run e2e"], name: "e2e" },
    { commands: ["npm run test"], name: "test" },
    { commands: ["npm run mutation"], name: "mutation" },
  ],
  validate: [
    {
      commands: ["npm run pack"],
      groups: [
        {
          commands: [
            "npm run clean",
            "npm run compile",
            "npm run resolve-paths",
          ],
          name: "build",
        },
      ],
      name: "build & pack",
    },
    { commands: ["npm run typecheck"], name: "typecheck" },
    {
      concurrent: true,
      groups: [
        { commands: ["npm run prettier"], name: "prettier" },
        { commands: ["npm run eslint"], name: "eslint" },
      ],
      name: "lint",
    },
    {
      groups: [
        { commands: ["npm run e2e"], name: "e2e" },
        { commands: ["npm run test"], name: "test" },
        { commands: ["npm run mutation"], name: "mutation" },
      ],
      name: "test:all",
    },
  ],
};
