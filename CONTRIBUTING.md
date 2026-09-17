# Contributing

Thanks for taking a look at README Health.

## Development Setup

```sh
git clone https://github.com/duhman/readme-health.git
cd readme-health
npm install
npm run typecheck
npm test
npm run build
```

Run the CLI from source while iterating:

```sh
npm run dev -- README.md --format github
```

## Pull Request Guidelines

- Keep rule changes focused and covered by tests.
- Include a README fixture or CLI test when behavior changes.
- Keep v1 local-first: avoid network calls unless an issue explicitly accepts that scope.
- Update the README and CHANGELOG when command-line behavior or user-facing output changes.
- Run `npm test`, `npm run typecheck`, and `npm run build` before opening a PR.

## Rule Design

Good rules should be:

- Explainable in one sentence
- Cheap to run locally
- Useful for maintainers reviewing a repository
- Specific enough to produce an actionable suggestion

## Safe Fix Allowlist (v1)

`--apply-fixes` only inserts clearly marked sections when README Health has high confidence from files in the repository root. It never rewrites existing prose.

| Fix | Inserts when | Repo signal |
| --- | --- | --- |
| License | README fails the License check | A root `LICENSE` file exists |
| Contributing | README fails the Contributing check | Root `CONTRIBUTING.md` exists |
| Installation | README fails the Installation check and no install-like heading exists | Root `package.json` has an npm `name` |

Inserted blocks are wrapped in HTML comments such as `<!-- readme-health:begin:license -->` so maintainers can review or remove them easily. Use `--dry-run` with `--apply-fixes` to preview unified-diff hunks before writing.

## Security

Do not open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md).
