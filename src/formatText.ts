import type { Finding, HealthReport } from "./types.js";

const labels: Record<Finding["status"], string> = {
  pass: "PASS",
  warn: "WARN",
  fail: "FAIL"
};

export function formatText(report: HealthReport): string {
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

  return `${lines.join("\n")}\n`;
}
