import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { analyzeReadme } from "../src/analyze.js";

async function writeProject(readme: string, files: Record<string, string> = {}) {
  const directory = join(tmpdir(), `readme-health-${randomUUID()}`);
  await mkdir(directory, { recursive: true });

  await writeFile(join(directory, "README.md"), readme, "utf8");

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = join(directory, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, "utf8");
  }

  return join(directory, "README.md");
}

function finding(report: Awaited<ReturnType<typeof analyzeReadme>>, id: string) {
  const match = report.findings.find((item) => item.id === id);
  if (!match) {
    throw new Error(`Missing finding ${id}`);
  }

  return match;
}

const completeReadme = `# Tool

Tool is a practical command-line project that demonstrates local README reference validation for maintainers.

## Installation

\`\`\`sh
npm install
\`\`\`

## Usage

\`\`\`sh
tool README.md
\`\`\`

## Tests

\`\`\`sh
npm test
\`\`\`

## Contributing

Contributions are welcome.

## License

MIT
`;

describe("local reference validation", () => {
  it("warns when relative links or images point to missing local files", async () => {
    const readmePath = await writeProject(`${completeReadme}

See the [guide](docs/guide.md).

![Screenshot](assets/screenshot.png)
`);

    const report = await analyzeReadme(readmePath);
    const localReferences = finding(report, "local-references");

    expect(localReferences.status).toBe("warn");
    expect(localReferences.message).toContain("2 local references");
    expect(localReferences.suggestion).toContain("docs/guide.md");
    expect(localReferences.suggestion).toContain("assets/screenshot.png");
  });

  it("passes when local references exist and ignores non-file URLs", async () => {
    const readmePath = await writeProject(`${completeReadme}

See the [guide](docs/guide.md#setup), [website](https://example.com), [email](mailto:hello@example.com), and [Usage](#usage).

![Screenshot](assets/screenshot.png)
`, {
      "docs/guide.md": "# Guide\n",
      "assets/screenshot.png": "fake image"
    });

    const report = await analyzeReadme(readmePath);
    const localReferences = finding(report, "local-references");

    expect(localReferences.status).toBe("pass");
    expect(localReferences.message).toContain("All relative local references resolve");
  });
});
