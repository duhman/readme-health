# README Health

[![CI](https://github.com/duhman/readme-health/actions/workflows/ci.yml/badge.svg)](https://github.com/duhman/readme-health/actions/workflows/ci.yml)

README Health is a local command-line checker for maintainers who want a practical signal on whether a project README explains installation, usage, testing, licensing, and contribution basics.

It is designed for fast repository audits. Point it at a README file and it returns a score, concrete findings, and suggestions you can act on before publishing or opening a project to contributors.

## Installation

```sh
npm install -g readme-health
```

For local development from this repository:

```sh
npm install
npm run build
npm link
```

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

## GitHub Action

Run README Health in CI:

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
      - uses: duhman/readme-health@v0.2.1
        with:
          readme-path: README.md
          strict: "true"
```

Use a custom threshold:

```yaml
- uses: duhman/readme-health@v0.2.1
  with:
    readme-path: docs/README.md
    fail-under: "80"
```

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
- `1`: analysis completed but the score was below `--fail-under` or `--strict`
- `2`: the README could not be read or the CLI arguments were invalid

## Roadmap

- Config file support for project-specific rule weights
- Suggested README patch output

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

## License

MIT
