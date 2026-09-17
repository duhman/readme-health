import type { Finding, HealthReport } from "./types.js";

function escapeWorkflowValue(value: string): string {
  return value.replace(/[\r\n]/g, " ").replace(/%/g, "%25").trim();
}

function annotationCommand(finding: Finding): string {
  const level = finding.status === "fail" ? "error" : "warning";
  const title = escapeWorkflowValue(finding.title);
  const message = escapeWorkflowValue(`${finding.message} ${finding.suggestion}`);

  return `::${level} title=${title}::${message}`;
}

export function formatGithubAnnotations(report: HealthReport): string {
  const commands = report.findings
    .filter((finding) => finding.status !== "pass")
    .map(annotationCommand);

  if (commands.length === 0) {
    return `::notice title=README Health::Score ${report.score}/${report.maxScore} (${report.grade}). All checks passed.\n`;
  }

  return `${commands.join("\n")}\n`;
}

function statusEmoji(status: Finding["status"]): string {
  switch (status) {
    case "pass":
      return "✅";
    case "warn":
      return "⚠️";
    case "fail":
      return "❌";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function formatGithubJobSummary(report: HealthReport): string {
  const lines = [
    "## README Health",
    "",
    `**Score:** ${report.score}/${report.maxScore} (${report.grade})`,
    "",
    "| Status | Check | Message |",
    "| --- | --- | --- |",
    ...report.findings.map(
      (finding) =>
        `| ${statusEmoji(finding.status)} ${finding.status.toUpperCase()} | ${finding.title} | ${finding.message.replace(/\|/g, "\\|")} |`
    ),
    ""
  ];

  return `${lines.join("\n")}\n`;
}

export function formatGithub(report: HealthReport): string {
  return [
    formatGithubAnnotations(report),
    "---",
    formatGithubJobSummary(report)
  ].join("\n");
}
