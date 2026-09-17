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

## Releasing to npm

Releases are automated when a maintainer pushes a version tag that matches `package.json` (for example `v0.2.4` for version `0.2.4`). The [Release workflow](./.github/workflows/release.yml) runs typecheck, tests, build, `npm publish --provenance`, and creates a GitHub Release.

Configure **one** of these authentication options before the first publish:

### npm trusted publishing (recommended)

1. On [npmjs.com](https://www.npmjs.com/), open **readme-health** → **Settings** → **Publishing access** → **Trusted publishers**.
2. Add a GitHub Actions trusted publisher for `duhman/readme-health` (workflow filename optional; restrict to `release.yml` if you prefer).
3. Push a matching tag. The workflow uses OIDC (`permissions.id-token: write`) and `npm publish --provenance` — no repository secret required.

### Classic token (fallback)

1. Create an npm automation token with publish access to `readme-health`.
2. Add it as the repository secret `NPM_TOKEN`.
3. Push a matching tag. `setup-node` passes the token as `NODE_AUTH_TOKEN` for `npm publish`.

### First publish when the Git tag already exists

If a version tag (for example `v0.2.4`) was pushed before the Release workflow existed, pushing the tag again will not re-run the workflow. After `NPM_TOKEN` or trusted publishing is configured:

1. Open **Actions** → **Release** → **Run workflow**.
2. Set **confirm_publish** to **true** and run the workflow.

The manual run checks out the tag that matches `package.json`, runs the same build/test/publish steps, publishes to npm, and skips creating a GitHub Release if one already exists for that tag.

Do not commit tokens or run `npm publish` from this cloud agent environment.

## Security

Do not open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md).
