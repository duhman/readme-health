import type { Finding, HealthReport } from "./types.js";

const snippets: Record<string, (finding: Finding) => string> = {
  title: () => `# Project Name`,
  description: () => `Project Name is a command-line tool that helps maintainers solve a specific problem. It is designed for people who need a clear, repeatable workflow.`,
  installation: () => `## Installation

\`\`\`sh
npm install
\`\`\``,
  usage: () => `## Usage

\`\`\`sh
project-name --help
\`\`\``,
  "code-examples": () => `\`\`\`sh
project-name README.md
\`\`\``,
  "code-fence-languages": () => `Use a language tag on fenced code blocks:

\`\`\`sh
npm test
\`\`\``,
  license: () => `## License

MIT`,
  contributing: () => `## Contributing

Issues and pull requests are welcome. Please open an issue before large changes.`,
  tests: () => `## Tests

\`\`\`sh
npm test
\`\`\``,
  "link-labels": () => `Use descriptive link text:

\`\`\`md
[Project documentation](https://example.com/docs)
\`\`\``,
  "image-alt-text": () => `Use descriptive image alt text:

\`\`\`md
![CLI report screenshot](./docs/report.png)
\`\`\``,
  "heading-order": () => `Use heading levels in order:

\`\`\`md
# Project Name

## Usage

### Options
\`\`\``,
  "local-references": (finding) => finding.suggestion
};

export function formatFixSuggestions(report: HealthReport): string {
  const actionableFindings = report.findings.filter((finding) => finding.status !== "pass");

  if (actionableFindings.length === 0) {
    return "No fix suggestions needed.\n";
  }

  const sections = actionableFindings.map((finding) => {
    const snippet = snippets[finding.id]?.(finding) ?? finding.suggestion;

    return [`### ${finding.title}`, finding.suggestion, "", snippet].join("\n");
  });

  return ["Suggested README snippets", "", ...sections].join("\n\n") + "\n";
}
