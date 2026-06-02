import { describe, expect, it } from "vitest";

import { analyzeMarkdown } from "../src/analyze.js";
import { excellentReadme, weakReadme } from "./fixtures.js";

function finding(report: Awaited<ReturnType<typeof analyzeMarkdown>>, id: string) {
  const match = report.findings.find((item) => item.id === id);
  if (!match) {
    throw new Error(`Missing finding ${id}`);
  }

  return match;
}

describe("analyzeMarkdown", () => {
  it("scores an excellent README at least 90", () => {
    const report = analyzeMarkdown(excellentReadme, "README.md");

    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.maxScore).toBe(100);
    expect(report.grade).toBe("excellent");
    expect(report.summary.failures).toBe(0);
  });

  it("creates a failing finding when usage instructions are missing", () => {
    const report = analyzeMarkdown(weakReadme, "README.md");

    expect(finding(report, "usage").status).toBe("fail");
    expect(finding(report, "usage").suggestion).toContain("Usage");
  });

  it("warns when fenced code blocks do not declare a language", () => {
    const markdown = `# Tool

This README has enough description text to make the project purpose clear to maintainers and contributors.

## Installation

\`\`\`
npm install
\`\`\`

## Usage

\`\`\`
tool run
\`\`\`

## Tests

\`\`\`
npm test
\`\`\`

## Contributing

Contributions are welcome.

## License

MIT
`;

    const report = analyzeMarkdown(markdown, "README.md");

    expect(finding(report, "code-fence-languages").status).toBe("warn");
    expect(finding(report, "code-fence-languages").message).toContain("missing languages");
  });

  it("flags multiple H1 headings", () => {
    const report = analyzeMarkdown(`# One

# Two
`, "README.md");

    expect(finding(report, "title").status).toBe("fail");
    expect(finding(report, "title").message).toContain("2 H1");
  });

  it("flags heading level jumps", () => {
    const report = analyzeMarkdown(`# Tool

### Skipped Level
`, "README.md");

    expect(finding(report, "heading-order").status).toBe("fail");
    expect(finding(report, "heading-order").message).toContain("H1 to H3");
  });

  it("flags images without alt text", () => {
    const report = analyzeMarkdown(`# Tool

This README has enough description text to make the project purpose clear.

![](./screenshot.png)
`, "README.md");

    expect(finding(report, "image-alt-text").status).toBe("fail");
  });

  it("flags links with empty labels", () => {
    const report = analyzeMarkdown(`# Tool

This README has enough description text to make the project purpose clear.

[](https://example.com)
`, "README.md");

    expect(finding(report, "link-labels").status).toBe("fail");
  });

  it("returns the public JSON report shape", () => {
    const report = analyzeMarkdown(excellentReadme, "README.md");

    expect(report).toMatchObject({
      filePath: "README.md",
      maxScore: 100,
      summary: {
        passed: expect.any(Number),
        warnings: expect.any(Number),
        failures: expect.any(Number)
      },
      findings: expect.any(Array)
    });
    expect(report.findings[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      status: expect.stringMatching(/pass|warn|fail/),
      points: expect.any(Number),
      maxPoints: expect.any(Number),
      message: expect.any(String),
      suggestion: expect.any(String)
    });
  });
});
