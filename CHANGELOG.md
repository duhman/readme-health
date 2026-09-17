# Changelog

## Unreleased

- Add Shields.io endpoint badge workflow and self-score badge on the README.
- Add "Add to your repo" quick-start workflow snippet and release automation docs.
- Add tag-triggered Release workflow for npm publish and GitHub Releases.

## 0.2.4

- Add `--apply-fixes` to insert high-confidence missing README sections from local repo files.
- Add `--dry-run` to preview README fix hunks without writing changes.
- Document the v1 safe-fix allowlist in CONTRIBUTING.md.

## 0.2.3

- Add a pull request workflow that posts or updates a single sticky README Health comment.
- Add PR comment formatting helpers with score delta, threshold status, and top fix suggestions.

## 0.2.2

- Add `--format github` for GitHub Actions workflow annotations and job summaries.
- Default the composite GitHub Action output format to `github`.
- Document honest install paths with `npx github:duhman/readme-health` until npm publish.
- Add SECURITY.md with supported versions and vulnerability reporting steps.
- Refresh dependency lockfile (includes postcss and nanoid bumps from Dependabot #5).
- Add license badge and security policy link to the README.

## 0.2.1

- Add GitHub Marketplace branding metadata for the action listing.

## 0.2.0

- Add a composite GitHub Action wrapper for README Health.
- Add a repository workflow that exercises the local action in CI.
- Document GitHub Action usage with strict and custom threshold examples.
- Update project workflows to current GitHub Actions runtime wrappers.

## 0.1.0

- Add `readme-health` CLI for local README analysis.
- Add text and JSON output formats.
- Add score thresholds with `--fail-under` and `--strict`.
- Add Markdown AST checks for sections, code examples, links, images, and heading order.
- Add TypeScript, Vitest tests, and GitHub Actions CI.
