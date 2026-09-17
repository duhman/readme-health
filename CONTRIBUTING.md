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

## Security

Do not open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md).
