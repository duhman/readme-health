# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| 0.2.x | Yes |
| < 0.2 | No |

## Reporting a Vulnerability

Please report security issues privately rather than opening a public GitHub issue.

1. Open a [GitHub Security Advisory](https://github.com/duhman/readme-health/security/advisories/new) for this repository, or
2. Email the maintainers through GitHub private contact if advisory creation is unavailable.

Include:

- A clear description of the issue
- Steps to reproduce
- Impact assessment (for example, local file access, path traversal, or CI injection)
- A suggested fix if you have one

We aim to acknowledge reports within 7 days and will coordinate disclosure once a fix is available.

## Scope

README Health analyzes local Markdown files and relative links. It does not fetch remote URLs or execute README content. Reports about missing README sections or scoring heuristics are better suited for regular issues.
