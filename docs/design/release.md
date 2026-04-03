# Release Process

## Branches

Pushes to `main` and `master` are release branches. GitHub Actions validates the repository and then runs Semantic Release.

## Required Inputs

- commits must follow the emoji conventional-commit format enforced by `commitlint.config.ts`
- `npm run validate` must pass on the release branch
- `npm run docs` must regenerate `docs/api/` without manual cleanup
- npm publishing must be configured through trusted publishing or an `NPM_TOKEN` secret

## Workflow Summary

1. `ci.yml` validates pull requests and pushes against `main` and `master`.
2. `release.yml` runs validation, rebuilds docs, and executes Semantic Release.
3. Semantic Release analyzes commit messages, creates a version tag, publishes the package to npm, and creates the GitHub release.
4. `docs.yml` publishes the `docs/` directory to GitHub Pages when a version tag is pushed.

The release workflow also repairs the legacy initial-release tag shape if the repository still has `v<major>` for a published `major.0.0` release. In that one case it creates the matching `v<major>.0.0` tag on the same commit before running Semantic Release.

## Local Verification

Use this sequence before merging release-impacting changes:

1. `npm run docs`
2. `npm run validate`
3. `npm run validate`
4. `npm run release:dry-run`