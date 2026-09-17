import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  applySafeFixes,
  formatUnifiedDiff,
  planSafeFixes,
  prepareApplyFixes
} from "../src/applyFixes.js";
import { analyzeMarkdown } from "../src/analyze.js";

const fixturesDirectory = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

async function readFixture(name: string): Promise<string> {
  return readFile(join(fixturesDirectory, name), "utf8");
}

async function createFixtureProject(options: {
  readme?: string;
  includeLicense?: boolean;
  includeContributing?: boolean;
  packageName?: string;
}) {
  const directory = await mkdtemp(join(tmpdir(), "readme-health-apply-"));
  const readmePath = join(directory, "README.md");
  const defaultReadme = options.readme ?? await readFixture("missing-sections-readme.md");

  await writeFile(readmePath, defaultReadme, "utf8");

  if (options.includeLicense ?? true) {
    await writeFile(join(directory, "LICENSE"), "MIT License\n", "utf8");
  }

  if (options.includeContributing ?? true) {
    await writeFile(join(directory, "CONTRIBUTING.md"), "# Contributing\n", "utf8");
  }

  if (options.packageName) {
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({ name: options.packageName, license: "MIT" }, null, 2),
      "utf8"
    );
  }

  return { directory, readmePath };
}

describe("applyFixes", () => {
  it("plans License and Contributing sections when repo files exist", async () => {
    const missingSectionsReadme = await readFixture("missing-sections-readme.md");
    const { directory, readmePath } = await createFixtureProject({});
    const report = analyzeMarkdown(missingSectionsReadme, readmePath);
    const fixes = await planSafeFixes({
      repoRoot: directory,
      readmePath,
      markdown: missingSectionsReadme,
      report
    });

    expect(fixes.map((fix) => fix.id)).toEqual(["contributing", "license"]);
    expect(fixes[0]?.section).toContain("<!-- readme-health:begin:contributing -->");
    expect(fixes[1]?.section).toContain("<!-- readme-health:begin:license -->");
    expect(fixes[0]?.section).toContain("[CONTRIBUTING.md](./CONTRIBUTING.md)");
    expect(fixes[1]?.section).toContain("[MIT](./LICENSE)");
  });

  it("returns exact dry-run hunks for missing License and Contributing sections", async () => {
    const missingSectionsReadme = await readFixture("missing-sections-readme.md");
    const { directory, readmePath } = await createFixtureProject({});
    const result = await prepareApplyFixes(directory, readmePath, missingSectionsReadme);
    const diff = formatUnifiedDiff(readmePath, missingSectionsReadme, result.markdown);

    expect(result.changed).toBe(true);
    expect(diff).toBe(`--- a/README.md
+++ b/README.md
@@ -5,0 +5,12 @@
+<!-- readme-health:begin:contributing -->
+## Contributing
+
+See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and pull request guidelines.
+<!-- readme-health:end:contributing -->
+
+<!-- readme-health:begin:license -->
+## License
+
+[MIT](./LICENSE)
+<!-- readme-health:end:license -->
+
`);
  });

  it("writes README changes when fixes are applied", async () => {
    const missingSectionsReadme = await readFixture("missing-sections-readme.md");
    const { directory, readmePath } = await createFixtureProject({});
    const result = await prepareApplyFixes(directory, readmePath, missingSectionsReadme);

    await writeFile(readmePath, result.markdown, "utf8");

    const written = await readFile(readmePath, "utf8");

    expect(written).toContain("## Contributing");
    expect(written).toContain("## License");
    expect(written).toContain("<!-- readme-health:begin:license -->");
  });

  it("is a no-op for an already-complete README", async () => {
    const completeReadme = await readFixture("complete-readme.md");
    const { directory, readmePath } = await createFixtureProject({
      readme: completeReadme,
      packageName: "readme-health"
    });
    const result = await prepareApplyFixes(directory, readmePath, completeReadme);

    expect(result.changed).toBe(false);
    expect(result.fixes).toEqual([]);
    expect(formatUnifiedDiff(readmePath, completeReadme, result.markdown)).toBe("");
  });

  it("adds Installation when package.json name exists and no install heading is present", async () => {
    const missingSectionsReadme = await readFixture("missing-sections-readme.md");
    const { directory, readmePath } = await createFixtureProject({
      includeLicense: false,
      includeContributing: false,
      packageName: "tiny-tool"
    });
    const result = await prepareApplyFixes(directory, readmePath, missingSectionsReadme);

    expect(result.fixes.map((fix) => fix.id)).toEqual(["installation"]);
    expect(result.markdown).toContain("npm install tiny-tool");
  });

  it("does not rewrite existing prose when inserting sections", () => {
    const markdown = "# Title\n\nExisting description stays intact.\n";
    const updated = applySafeFixes(markdown, [
      {
        id: "license",
        insertAt: 3,
        section: `<!-- readme-health:begin:license -->
## License

MIT
<!-- readme-health:end:license -->`
      }
    ]);

    expect(updated).toContain("Existing description stays intact.");
    expect(updated.indexOf("Existing description stays intact.")).toBeLessThan(updated.indexOf("## License"));
  });
});
