import type { Finding, HealthReport } from "./types.js";

export const PR_COMMENT_MARKER = "<!-- readme-health-pr-comment -->";

export type PrCommentInput = {
  report: HealthReport;
  baseScore?: number;
  threshold: number;
  readmePath: string;
};

const STATUS_PRIORITY: Record<Finding["status"], number> = {
  fail: 0,
  warn: 1,
  pass: 2
};

export function getTopFixSuggestions(report: HealthReport, limit = 5): Finding[] {
  return report.findings
    .filter((finding) => finding.status !== "pass")
    .sort((left, right) => STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status])
    .slice(0, limit);
}

function formatDelta(baseScore: number | undefined, score: number): string | undefined {
  if (baseScore === undefined) {
    return undefined;
  }

  const delta = score - baseScore;

  if (delta === 0) {
    return "Unchanged vs base branch.";
  }

  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} vs base branch (${baseScore}/100 → ${score}/100).`;
}

function formatThresholdResult(passed: boolean, threshold: number): string {
  return passed ? `**Pass** (threshold: ${threshold})` : `**Fail** (threshold: ${threshold})`;
}

function formatFixSuggestionsSection(findings: Finding[]): string[] {
  if (findings.length === 0) {
    return [];
  }

  const lines = ["", "### Top fixes", ""];

  for (const [index, finding] of findings.entries()) {
    lines.push(`${index + 1}. **${finding.title}** — ${finding.suggestion}`);
  }

  return lines;
}

export function shouldUseDetailedComment(
  report: HealthReport,
  threshold: number,
  baseScore?: number
): boolean {
  const passed = report.score >= threshold;

  if (!passed) {
    return true;
  }

  if (baseScore !== undefined && report.score < baseScore) {
    return true;
  }

  return false;
}

export function formatPrComment(input: PrCommentInput): string {
  const { report, baseScore, threshold, readmePath } = input;
  const passed = report.score >= threshold;
  const detailed = shouldUseDetailedComment(report, threshold, baseScore);
  const deltaLine = formatDelta(baseScore, report.score);
  const lines = [
    PR_COMMENT_MARKER,
    "## README Health",
    "",
    `**File:** \`${readmePath}\``,
    `**Score:** ${report.score}/${report.maxScore} (${report.grade}) — ${formatThresholdResult(passed, threshold)}`
  ];

  if (deltaLine) {
    lines.push(`**Change:** ${deltaLine}`);
  }

  if (!detailed) {
    lines.push("", "All checks passed.");
    return `${lines.join("\n")}\n`;
  }

  if (passed && baseScore !== undefined && report.score < baseScore) {
    lines.push("", "README score dropped vs the base branch. Consider the suggestions below.");
  }

  const suggestions = getTopFixSuggestions(report);

  if (suggestions.length === 0) {
    lines.push("", "No fix suggestions available.");
  } else {
    lines.push(...formatFixSuggestionsSection(suggestions));
  }

  return `${lines.join("\n")}\n`;
}
