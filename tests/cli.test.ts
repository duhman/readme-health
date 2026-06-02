import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

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
});
