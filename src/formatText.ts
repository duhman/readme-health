import type { Finding, HealthReport } from "./types.js";
import { formatFixSuggestions } from "./fixSuggestions.js";

const labels: Record<Finding["status"], string> = {
  pass: "PASS",
  warn: "WARN",
  fail: "FAIL"
};

type FormatTextOptions = {
  includeFixSuggestions?: boolean;
};

export function formatText(report: HealthReport, options: FormatTextOptions = {}): string {
  const lines = [
    `README Health: ${report.score}/${report.maxScore} ${report.grade}`,
    `File: ${report.filePath}`,
    "",
    ...report.findings.map((finding) =>
      `${labels[finding.status]}  ${finding.title}: ${finding.message}`
    ),
    "",
    "Run with --format json for machine-readable output."
  ];

  const reportText = `${lines.join("\n")}\n`;

  if (!options.includeFixSuggestions) {
    return reportText;
  }

  return `${reportText}\n${formatFixSuggestions(report)}`;
}
