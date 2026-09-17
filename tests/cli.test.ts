import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import packageJson from "../package.json" with { type: "json" };
import { runCli } from "../src/cli.js";
import { excellentReadme, weakReadme } from "./fixtures.js";

async function createTempProject(readme = excellentReadme) {
  const directory = await mkdtemp(join(tmpdir(), "readme-health-"));
  await writeFile(join(directory, "README.md"), readme, "utf8");
  return directory;
}

describe("runCli", () => {
  it("reads README.md from the current directory by default", async () => {
    const cwd = await createTempProject();
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli([], {
      cwd,
      stdout: (text) => stdout.push(text),
      stderr: (text) => stderr.push(text)
    });

    expect(exitCode).toBe(0);
    expect(stderr.join("")).toBe("");
    expect(stdout.join("")).toContain("README Health:");
  });

  it("reads an explicit README path", async () => {
    const cwd = await createTempProject();
    await writeFile(join(cwd, "DOCS.md"), excellentReadme, "utf8");
    const stdout: string[] = [];

    const exitCode = await runCli(["DOCS.md"], {
      cwd,
      stdout: (text) => stdout.push(text),
      stderr: () => undefined
    });

    expect(exitCode).toBe(0);
    expect(stdout.join("")).toContain("DOCS.md");
  });

  it("returns exit code 2 when the file is missing", async () => {
    const cwd = await createTempProject();
    const stderr: string[] = [];

    const exitCode = await runCli(["MISSING.md"], {
      cwd,
      stdout: () => undefined,
      stderr: (text) => stderr.push(text)
    });

    expect(exitCode).toBe(2);
    expect(stderr.join("")).toContain("Unable to read");
  });

  it("returns exit code 1 when --fail-under is not met", async () => {
    const cwd = await createTempProject(weakReadme);

    const exitCode = await runCli(["--fail-under", "80"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });

    expect(exitCode).toBe(1);
  });

  it("uses 85 as the strict threshold", async () => {
    const cwd = await createTempProject(weakReadme);

    const exitCode = await runCli(["--strict"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });

    expect(exitCode).toBe(1);
  });

  it("prints parseable JSON without extra text", async () => {
    const cwd = await createTempProject();
    const stdout: string[] = [];

    const exitCode = await runCli(["--format", "json"], {
      cwd,
      stdout: (text) => stdout.push(text),
      stderr: () => undefined
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join(""))).toMatchObject({
      filePath: join(cwd, "README.md"),
      score: expect.any(Number),
      findings: expect.any(Array)
    });
  });

  it("applies configured rule weights from readme-health.config.json", async () => {
    const cwd = await createTempProject(weakReadme);
    await writeFile(join(cwd, "readme-health.config.json"), JSON.stringify({
      ruleWeights: {
        usage: 40
      }
    }), "utf8");
    const stdout: string[] = [];

    const exitCode = await runCli(["--format", "json"], {
      cwd,
      stdout: (text) => stdout.push(text),
      stderr: () => undefined
    });
    const report = JSON.parse(stdout.join(""));
    const usage = report.findings.find((finding: { id: string }) => finding.id === "usage");

    expect(exitCode).toBe(0);
    expect(usage).toMatchObject({
      points: 0,
      maxPoints: 40
    });
    expect(report.score).toBe(21);
  });

  it("uses configured failUnder when no CLI threshold is provided", async () => {
    const cwd = await createTempProject(weakReadme);
    await writeFile(join(cwd, "readme-health.config.json"), JSON.stringify({
      failUnder: 80
    }), "utf8");

    const exitCode = await runCli([], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });

    expect(exitCode).toBe(1);
  });

  it("lets --fail-under override configured failUnder", async () => {
    const cwd = await createTempProject(weakReadme);
    await writeFile(join(cwd, "readme-health.config.json"), JSON.stringify({
      failUnder: 100
    }), "utf8");

    const exitCode = await runCli(["--fail-under", "0"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });

    expect(exitCode).toBe(0);
  });

  it("lets --strict override configured failUnder", async () => {
    const cwd = await createTempProject(weakReadme);
    await writeFile(join(cwd, "readme-health.config.json"), JSON.stringify({
      failUnder: 0
    }), "utf8");

    const exitCode = await runCli(["--strict"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });

    expect(exitCode).toBe(1);
  });

  it("returns exit code 2 for invalid JSON config", async () => {
    const cwd = await createTempProject();
    const stderr: string[] = [];
    await writeFile(join(cwd, "readme-health.config.json"), "{ nope", "utf8");

    const exitCode = await runCli([], {
      cwd,
      stdout: () => undefined,
      stderr: (text) => stderr.push(text)
    });

    expect(exitCode).toBe(2);
    expect(stderr.join("")).toContain("Invalid config");
  });

  it("returns exit code 2 for unknown configured rule IDs", async () => {
    const cwd = await createTempProject();
    const stderr: string[] = [];
    await writeFile(join(cwd, "readme-health.config.json"), JSON.stringify({
      ruleWeights: {
        "local-references": 10,
        madeUpRule: 5
      }
    }), "utf8");

    const exitCode = await runCli([], {
      cwd,
      stdout: () => undefined,
      stderr: (text) => stderr.push(text)
    });

    expect(exitCode).toBe(2);
    expect(stderr.join("")).toContain("Unknown rule weight");
    expect(stderr.join("")).toContain("local-references");
  });

  it("returns exit code 2 for invalid configured weights", async () => {
    const cwd = await createTempProject();
    const stderr: string[] = [];
    await writeFile(join(cwd, "readme-health.config.json"), JSON.stringify({
      ruleWeights: {
        usage: 0
      }
    }), "utf8");

    const exitCode = await runCli([], {
      cwd,
      stdout: () => undefined,
      stderr: (text) => stderr.push(text)
    });

    expect(exitCode).toBe(2);
    expect(stderr.join("")).toContain("usage");
    expect(stderr.join("")).toContain("positive integer");
  });

  it("returns exit code 2 for invalid configured failUnder", async () => {
    const cwd = await createTempProject();
    const stderr: string[] = [];
    await writeFile(join(cwd, "readme-health.config.json"), JSON.stringify({
      failUnder: 101
    }), "utf8");

    const exitCode = await runCli([], {
      cwd,
      stdout: () => undefined,
      stderr: (text) => stderr.push(text)
    });

    expect(exitCode).toBe(2);
    expect(stderr.join("")).toContain("failUnder");
    expect(stderr.join("")).toContain("0 to 100");
  });

  it("prints fix suggestions for weak README findings", async () => {
    const cwd = await createTempProject(weakReadme);
    const stdout: string[] = [];

    const exitCode = await runCli(["--fix-suggestions"], {
      cwd,
      stdout: (text) => stdout.push(text),
      stderr: () => undefined
    });

    const output = stdout.join("");

    expect(exitCode).toBe(0);
    expect(output).toContain("Suggested README snippets");
    expect(output).toContain("## Installation");
    expect(output).toContain("## Usage");
    expect(output).toContain("## Tests");
    expect(output).toContain("## License");
  });

  it("keeps JSON output parseable when fix suggestions are requested", async () => {
    const cwd = await createTempProject(weakReadme);
    const stdout: string[] = [];

    const exitCode = await runCli(["--format", "json", "--fix-suggestions"], {
      cwd,
      stdout: (text) => stdout.push(text),
      stderr: () => undefined
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join(""))).toMatchObject({
      score: expect.any(Number),
      findings: expect.any(Array)
    });
  });

  it("explains when no fix suggestions are needed", async () => {
    const cwd = await createTempProject(excellentReadme.replace("![Terminal report](./docs/report.png)\n\n", ""));
    const stdout: string[] = [];

    const exitCode = await runCli(["--fix-suggestions"], {
      cwd,
      stdout: (text) => stdout.push(text),
      stderr: () => undefined
    });

    expect(exitCode).toBe(0);
    expect(stdout.join("")).toContain("No fix suggestions needed.");
  });

  it("prints github workflow annotations and summary", async () => {
    const cwd = await createTempProject(weakReadme);
    const stdout: string[] = [];

    const exitCode = await runCli(["--format", "github"], {
      cwd,
      stdout: (text) => stdout.push(text),
      stderr: () => undefined
    });

    const output = stdout.join("");

    expect(exitCode).toBe(0);
    expect(output).toContain("::error title=Usage::");
    expect(output).toContain("## README Health");
  });

  it("writes the job summary when GITHUB_STEP_SUMMARY is set", async () => {
    const cwd = await createTempProject(weakReadme);
    const summaryPath = join(cwd, "step-summary.md");
    const previous = process.env.GITHUB_STEP_SUMMARY;
    process.env.GITHUB_STEP_SUMMARY = summaryPath;

    try {
      const exitCode = await runCli(["--format", "github"], {
        cwd,
        stdout: () => undefined,
        stderr: () => undefined
      });
      const summary = await readFile(summaryPath, "utf8");

      expect(exitCode).toBe(0);
      expect(summary).toContain("## README Health");
      expect(summary).toContain("| Usage |");
    } finally {
      if (previous === undefined) {
        delete process.env.GITHUB_STEP_SUMMARY;
      } else {
        process.env.GITHUB_STEP_SUMMARY = previous;
      }
    }
  });

  it("returns exit code 2 when --dry-run is used without --apply-fixes", async () => {
    const cwd = await createTempProject();
    const stderr: string[] = [];

    const exitCode = await runCli(["--dry-run"], {
      cwd,
      stdout: () => undefined,
      stderr: (text) => stderr.push(text)
    });

    expect(exitCode).toBe(2);
    expect(stderr.join("")).toContain("--dry-run requires --apply-fixes");
  });

  it("prints dry-run hunks for high-confidence README fixes", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "readme-health-apply-cli-"));
    await writeFile(join(cwd, "README.md"), "# Tiny Tool\n\nTiny Tool helps maintainers.\n", "utf8");
    await writeFile(join(cwd, "LICENSE"), "MIT License\n", "utf8");
    await writeFile(join(cwd, "CONTRIBUTING.md"), "# Contributing\n", "utf8");
    const stdout: string[] = [];

    const exitCode = await runCli(["--apply-fixes", "--dry-run"], {
      cwd,
      stdout: (text) => stdout.push(text),
      stderr: () => undefined
    });
    const output = stdout.join("");

    expect(exitCode).toBe(0);
    expect(output).toContain("README fixes to apply:");
    expect(output).toContain("--- a/README.md");
    expect(output).toContain("<!-- readme-health:begin:contributing -->");
    expect(await readFile(join(cwd, "README.md"), "utf8")).toBe("# Tiny Tool\n\nTiny Tool helps maintainers.\n");
  });

  it("writes README fixes when --apply-fixes is used without --dry-run", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "readme-health-apply-cli-"));
    await writeFile(join(cwd, "README.md"), "# Tiny Tool\n\nTiny Tool helps maintainers.\n", "utf8");
    await writeFile(join(cwd, "LICENSE"), "MIT License\n", "utf8");
    await writeFile(join(cwd, "CONTRIBUTING.md"), "# Contributing\n", "utf8");
    const stdout: string[] = [];

    const exitCode = await runCli(["--apply-fixes"], {
      cwd,
      stdout: (text) => stdout.push(text),
      stderr: () => undefined
    });
    const written = await readFile(join(cwd, "README.md"), "utf8");

    expect(exitCode).toBe(0);
    expect(stdout.join("")).toContain("Applied README fixes");
    expect(written).toContain("## License");
    expect(written).toContain("## Contributing");
  });

  it("reports a no-op when --apply-fixes finds nothing to change", async () => {
    const cwd = await createTempProject(excellentReadme.replace("![Terminal report](./docs/report.png)\n\n", ""));
    await writeFile(join(cwd, "LICENSE"), "MIT License\n", "utf8");
    await writeFile(join(cwd, "CONTRIBUTING.md"), "# Contributing\n", "utf8");
    const stdout: string[] = [];

    const exitCode = await runCli(["--apply-fixes", "--dry-run"], {
      cwd,
      stdout: (text) => stdout.push(text),
      stderr: () => undefined
    });

    expect(exitCode).toBe(0);
    expect(stdout.join("")).toContain("No README fixes to apply.");
  });

  it("prints the package version", async () => {
    const stdout: string[] = [];

    const exitCode = await runCli(["--version"], {
      stdout: (text) => stdout.push(text),
      stderr: () => undefined
    });

    expect(exitCode).toBe(0);
    expect(stdout.join("").trim()).toBe(packageJson.version);
  });
});
