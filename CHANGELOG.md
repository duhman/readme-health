# Changelog

## Unreleased

- Add daily maintenance automation for deterministic dependency upkeep.
- Add `readme-health.config.json` support for per-rule weights and default score thresholds.
- Add warning-only validation for relative local README links and images.
- Add `--fix-suggestions` for copy-pasteable README fix snippets.
- Update README action examples to the latest released tag.

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
