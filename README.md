# README Health

[![CI](https://github.com/duhman/readme-health/actions/workflows/ci.yml/badge.svg)](https://github.com/duhman/readme-health/actions/workflows/ci.yml)
[![README Health](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/duhman/readme-health/main/badge/readme-health.json)](https://github.com/duhman/readme-health)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

README Health is a local command-line checker for maintainers who want a practical signal on whether a project README explains installation, usage, testing, licensing, and contribution basics.

It is designed for fast repository audits. Point it at a README file and it returns a score, concrete findings, and suggestions you can act on before publishing or opening a project to contributors.

## Installation

Run the CLI directly from GitHub (no npm publish required):

```sh
npx github:duhman/readme-health
```

Pin a release tag for reproducible CI or local runs:

```sh
npx --package=github:duhman/readme-health@v0.2.4 readme-health README.md
```

For local development from this repository:

```sh
git clone https://github.com/duhman/readme-health.git
cd readme-health
npm install
npm run build
npm link
```

When the package is published to npm, global install will also work:

```sh
npm install -g readme-health
```

## Add to your repo

Drop this workflow into `.github/workflows/readme-health.yml` to fail CI when your README score drops below 80:

```yaml
name: README Health

on:
  pull_request:
  push:
    branches: [main]

jobs:
  readme-health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: duhman/readme-health@v0.2.4
        with:
          readme-path: README.md
          fail-under: "80"
```

For a sticky pull request comment with score delta and fix suggestions, copy [`.github/workflows/readme-health-pr-comment.yml`](./.github/workflows/readme-health-pr-comment.yml) and adjust paths or thresholds as needed.

## README score badge

Show your README score with a [Shields.io endpoint badge](https://shields.io/badges/endpoint-badge) backed by a JSON file on your default branch.

1. Add a workflow (see [`.github/workflows/readme-health-badge.yml`](./.github/workflows/readme-health-badge.yml)) that runs `readme-health`, writes Shields endpoint JSON, and commits it on `main` when the score changes.
2. Commit an initial endpoint file, for example `badge/readme-health.json`:

```json
{
  "schemaVersion": 1,
  "label": "readme health",
  "message": "82/100",
  "color": "green"
}
```

3. Link the badge in your README (replace `OWNER/REPO`):

```markdown
[![README Health](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/OWNER/REPO/main/badge/readme-health.json)](https://github.com/OWNER/REPO)
```

Shields reads the raw JSON URL on each request, so the badge updates after your workflow pushes a new score.

## Usage

Analyze the README in the current directory:

```sh
readme-health
```

Analyze a specific Markdown file:

```sh
readme-health docs/README.md
```

Fail CI-style checks when the score is too low:

```sh
readme-health README.md --fail-under 80
```

Use the stricter default threshold:

```sh
readme-health README.md --strict
```

Output JSON for automation:

```sh
readme-health README.md --format json
```

Emit GitHub Actions annotations and a job summary (ideal for CI):

```sh
readme-health README.md --format github
```

Print copy-pasteable snippets for warnings and failures:

```sh
readme-health README.md --fix-suggestions
```

Insert high-confidence missing sections from local repo files:

```sh
readme-health README.md --apply-fixes --dry-run
readme-health README.md --apply-fixes
```

`--apply-fixes` only adds clearly marked blocks for missing License, Contributing, or Installation sections when matching files exist in the repository root. It never rewrites existing prose. Preview unified-diff hunks with `--dry-run` before writing. See [CONTRIBUTING.md](./CONTRIBUTING.md#safe-fix-allowlist-v1) for the v1 allowlist.

## Configuration

README Health automatically reads `readme-health.config.json` from the current working directory when the file exists.

```json
{
  "failUnder": 80,
  "ruleWeights": {
    "usage": 20,
    "license": 4
  }
}
```

Use `failUnder` to set a project default threshold. CLI flags take precedence:

| Setting | Precedence | Behavior |
| --- | --- | --- |
| `--strict` | 1 | Uses threshold `85` |
| `--fail-under <score>` | 2 | Uses the provided CLI threshold |
| `failUnder` | 3 | Uses the config threshold when no CLI threshold is set |

Use `ruleWeights` to tune scored rules while keeping the final report normalized to `0-100`. Supported rule IDs are `title`, `description`, `installation`, `usage`, `code-examples`, `code-fence-languages`, `license`, `contributing`, `tests`, `link-labels`, `image-alt-text`, and `heading-order`.

Warning-only checks such as `local-references` are not configurable. Invalid JSON, unknown rule IDs, or invalid values exit with code `2` and print a clear error to stderr.

## GitHub Action

Run README Health in CI with workflow annotations and a job summary:

```yaml
name: README Health

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  readme-health:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - uses: duhman/readme-health@v0.2.4
        with:
          readme-path: README.md
          strict: "true"
```

The action defaults to `--format github`, which prints workflow commands and writes a markdown summary to `$GITHUB_STEP_SUMMARY`.

Use plain text logs instead:

```yaml
- uses: duhman/readme-health@v0.2.4
  with:
    readme-path: README.md
    format: text
```

Use a custom threshold:

```yaml
- uses: duhman/readme-health@v0.2.4
  with:
    readme-path: docs/README.md
    fail-under: "80"
```

## PR check comment

Copy [`.github/workflows/readme-health-pr-comment.yml`](./.github/workflows/readme-health-pr-comment.yml) into your repository to post a single sticky pull request comment when README or docs markdown changes.

The workflow:

- Runs `readme-health` with `--format github` for workflow annotations and a job summary
- Compares the PR README score against the base branch when possible
- Updates one comment identified by `<!-- readme-health-pr-comment -->` (no comment spam on new pushes)
- Shows pass/fail vs threshold (default `80`), score delta, and up to five prioritized fix suggestions
- Keeps passing PRs brief unless the README score drops vs the base branch

Enable it on pull requests by committing the workflow file. You can also run it manually with `workflow_dispatch`.

## Daily Maintenance

This repository includes a scheduled maintenance workflow that runs every day and can also be triggered manually from GitHub Actions.

The workflow:

- Refreshes dependency lockfile entries with `npm update --package-lock-only`
- Applies compatible audit fixes with `npm audit fix --package-lock-only`
- Runs typecheck, tests, build, and README Health strict mode
- Commits to `main` only when dependency metadata actually changes

## Example Output

```text
README Health: 82/100 good
File: /path/to/project/README.md

PASS  Title: README has one H1 heading.
WARN  Code Fence Languages: 2 fenced code blocks are missing languages.
FAIL  Usage: README is missing usage instructions.

Run with --format json for machine-readable output.
```

## JSON Output

```json
{
  "filePath": "/path/to/project/README.md",
  "score": 82,
  "maxScore": 100,
  "grade": "good",
  "summary": {
    "passed": 9,
    "warnings": 1,
    "failures": 2
  },
  "findings": [
    {
      "id": "usage",
      "title": "Usage",
      "status": "fail",
      "points": 0,
      "maxPoints": 12,
      "message": "README is missing usage instructions.",
      "suggestion": "Add a Usage section with a runnable example."
    }
  ]
}
```

## Checks

README Health scores these areas:

- One clear H1 title
- Short project description near the top
- Installation instructions
- Usage instructions
- At least one fenced code example
- Language tags on fenced code blocks
- License information
- Contributing or development instructions
- Test or verification instructions
- Non-empty Markdown link labels
- Relative local links and images that resolve on disk
- Alt text on images
- Heading levels that do not skip levels

## Exit Codes

- `0`: analysis completed and the score met the configured threshold
- `1`: analysis completed but the score was below the active threshold
- `2`: the README could not be read, CLI arguments were invalid, or `readme-health.config.json` was invalid

## Development

Run the test suite:

```sh
npm test
```

Run TypeScript checks:

```sh
npm run typecheck
```

Build the CLI:

```sh
npm run build
```

Run the CLI directly from source:

```sh
npm run dev -- README.md
```

## Contributing

Issues and pull requests are welcome. Keep changes focused on local README analysis unless the issue explicitly expands scope. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow.

## Security

See [SECURITY.md](./SECURITY.md) for supported versions and how to report vulnerabilities.

## License

MIT
