import { describe, expect, it } from "vitest";

import { analyzeMarkdown } from "../src/analyze.js";
import {
  formatGithub,
  formatGithubAnnotations,
  formatGithubJobSummary
} from "../src/formatGithub.js";
import { excellentReadme, weakReadme } from "./fixtures.js";

describe("formatGithub", () => {
  it("emits workflow errors and warnings for failing checks", () => {
    const report = analyzeMarkdown(weakReadme, "README.md");
    const output = formatGithubAnnotations(report);

    expect(output).toContain("::error title=Usage::");
    expect(output).toContain("::error title=Installation::");
    expect(output).not.toContain("::error title=Title::");
  });

  it("emits a notice when all checks pass", () => {
    const report = analyzeMarkdown(excellentReadme, "README.md");
    const output = formatGithubAnnotations(report);

    expect(output).toContain("::notice title=README Health::");
    expect(output).toContain("All checks passed");
  });

  it("builds a markdown job summary table", () => {
    const report = analyzeMarkdown(weakReadme, "README.md");
    const summary = formatGithubJobSummary(report);

    expect(summary).toContain("## README Health");
    expect(summary).toContain("| Status | Check | Message |");
    expect(summary).toContain("| Usage |");
    expect(summary).toContain("README is missing usage instructions.");
  });

  it("combines annotations and summary in github format output", () => {
    const report = analyzeMarkdown(weakReadme, "README.md");
    const output = formatGithub(report);

    expect(output).toContain("::error title=Usage::");
    expect(output).toContain("## README Health");
    expect(output).toContain("---");
  });
});
