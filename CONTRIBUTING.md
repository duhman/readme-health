# Contributing

Thanks for taking a look at README Health.

## Development Setup

```sh
npm install
npm run typecheck
npm test
npm run build
```

## Pull Request Guidelines

- Keep rule changes focused and covered by tests.
- Include a README fixture or CLI test when behavior changes.
- Keep v1 local-first: avoid network calls unless an issue explicitly accepts that scope.
- Update the README when command-line behavior changes.

## Rule Design

Good rules should be:

- Explainable in one sentence
- Cheap to run locally
- Useful for maintainers reviewing a repository
- Specific enough to produce an actionable suggestion
