import { describe, expect, it } from "vitest";

import { analyzeMarkdown } from "../src/analyze.js";
import {
  formatPrComment,
  getTopFixSuggestions,
  PR_COMMENT_MARKER,
  shouldUseDetailedComment
} from "../src/formatPrComment.js";
import { excellentReadme, weakReadme } from "./fixtures.js";

describe("formatPrComment", () => {
  it("includes the sticky comment marker", () => {
    const report = analyzeMarkdown(excellentReadme, "README.md");
    const body = formatPrComment({
      report,
      threshold: 80,
      readmePath: "README.md"
    });

    expect(body.startsWith(`${PR_COMMENT_MARKER}\n`)).toBe(true);
  });

  it("renders a brief pass comment when checks pass and score did not drop", () => {
    const report = analyzeMarkdown(excellentReadme, "README.md");
    const body = formatPrComment({
      report,
      baseScore: report.score - 2,
      threshold: 80,
      readmePath: "README.md"
    });

    expect(body).toContain("**Pass** (threshold: 80)");
    expect(body).toContain("All checks passed.");
    expect(body).not.toContain("### Top fixes");
  });

  it("renders fail status, delta, and top fix suggestions", () => {
    const report = analyzeMarkdown(weakReadme, "README.md");
    const body = formatPrComment({
      report,
      baseScore: 90,
      threshold: 80,
      readmePath: "README.md"
    });

    expect(body).toContain("**Fail** (threshold: 80)");
    expect(body).toContain("**Change:** -");
    expect(body).toContain("### Top fixes");
    expect(body).toContain("**Usage**");
    expect(getTopFixSuggestions(report).length).toBeLessThanOrEqual(5);
  });

  it("requires a detailed comment when score drops but still passes", () => {
    const report = analyzeMarkdown(excellentReadme, "README.md");

    expect(shouldUseDetailedComment(report, 80, report.score + 5)).toBe(true);

    const body = formatPrComment({
      report,
      baseScore: report.score + 5,
      threshold: 80,
      readmePath: "README.md"
    });

    expect(body).toContain("README score dropped vs the base branch.");
    expect(body).not.toContain("All checks passed.");
  });

  it("prioritizes failures before warnings in fix suggestions", () => {
    const report = analyzeMarkdown(weakReadme, "README.md");
    const suggestions = getTopFixSuggestions(report, 5);
    const firstFailureIndex = suggestions.findIndex((finding) => finding.status === "fail");

    expect(firstFailureIndex).toBeGreaterThanOrEqual(0);
    expect(suggestions.slice(0, firstFailureIndex).every((finding) => finding.status === "fail")).toBe(
      true
    );
  });
});
