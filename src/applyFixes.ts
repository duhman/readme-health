import { access, readFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";

import { analyzeMarkdown } from "./analyze.js";
import type { Finding, HealthReport } from "./types.js";

export type SafeFixId = "installation" | "contributing" | "license";

export type SafeFix = {
  id: SafeFixId;
  section: string;
  insertAt: number;
};

export type ApplyFixesContext = {
  repoRoot: string;
  readmePath: string;
  markdown: string;
  report: HealthReport;
};

export type ApplyFixesResult = {
  fixes: SafeFix[];
  markdown: string;
  changed: boolean;
};

const LICENSE_FILENAMES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "LICENCE.md"] as const;

const INSTALL_HEADING_PATTERN = /\b(install|installation|getting started|setup|quick start)\b/i;
const LICENSE_HEADING_PATTERN = /\blicen[cs]e\b/i;

function markerBegin(id: SafeFixId): string {
  return `<!-- readme-health:begin:${id} -->`;
}

function markerEnd(id: SafeFixId): string {
  return `<!-- readme-health:end:${id} -->`;
}

function wrapSection(id: SafeFixId, body: string): string {
  return [markerBegin(id), body.trimEnd(), markerEnd(id)].join("\n");
}

function linesOf(markdown: string): string[] {
  return markdown.split("\n");
}

function headingLinePattern(depth: number): RegExp {
  return new RegExp(`^#{${depth}}\\s+`, "u");
}

function findHeadingLine(lines: string[], depth: number, pattern: RegExp): number | undefined {
  const prefix = headingLinePattern(depth);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line && prefix.test(line) && pattern.test(line.replace(prefix, "").trim())) {
      return index;
    }
  }

  return undefined;
}

function findFirstH2Line(lines: string[]): number | undefined {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line && headingLinePattern(2).test(line)) {
      return index;
    }
  }

  return undefined;
}

function insertAfterDescription(lines: string[]): number {
  let index = 0;

  while (index < lines.length && lines[index]?.trim() === "") {
    index += 1;
  }

  if (lines[index] && headingLinePattern(1).test(lines[index]!)) {
    index += 1;
  }

  while (index < lines.length && lines[index]?.trim() === "") {
    index += 1;
  }

  while (index < lines.length) {
    const line = lines[index];

    if (line && headingLinePattern(2).test(line)) {
      break;
    }

    index += 1;
  }

  return index;
}

function insertBeforeLicenseOrEnd(lines: string[]): number {
  const licenseLine = findHeadingLine(lines, 2, LICENSE_HEADING_PATTERN);

  if (licenseLine !== undefined) {
    return licenseLine;
  }

  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
    lines.pop();
  }

  return lines.length;
}

function relativeRepoPath(fromFile: string, toFile: string): string {
  const fromDir = dirname(fromFile);
  const rel = relative(fromDir, toFile).replace(/\\/g, "/");

  if (!rel.startsWith(".")) {
    return `./${rel}`;
  }

  return rel;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findLicenseFile(repoRoot: string): Promise<string | undefined> {
  for (const filename of LICENSE_FILENAMES) {
    const candidate = join(repoRoot, filename);

    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function readPackageJson(repoRoot: string): Promise<{ name?: string; license?: string } | undefined> {
  const packageJsonPath = join(repoRoot, "package.json");

  if (!(await fileExists(packageJsonPath))) {
    return undefined;
  }

  try {
    const raw = await readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { name?: string; license?: string };

    return parsed;
  } catch {
    return undefined;
  }
}

async function inferLicenseLabel(repoRoot: string, licensePath: string, pkg?: { license?: string }): Promise<string> {
  if (typeof pkg?.license === "string" && pkg.license.trim()) {
    return pkg.license.trim();
  }

  try {
    const contents = (await readFile(licensePath, "utf8")).trim();
    const firstLine = contents.split("\n").find((line) => line.trim())?.trim() ?? "";

    if (/^MIT License$/i.test(firstLine) || /^The MIT License$/i.test(firstLine)) {
      return "MIT";
    }

    if (/Apache License/i.test(firstLine)) {
      return "Apache-2.0";
    }

    if (/BSD/i.test(firstLine)) {
      return firstLine;
    }
  } catch {
    // fall through
  }

  return basename(licensePath);
}

function findingFailed(report: HealthReport, id: string): boolean {
  return report.findings.some((finding) => finding.id === id && finding.status === "fail");
}

function hasInstallHeading(markdown: string): boolean {
  return linesOf(markdown).some((line) => headingLinePattern(2).test(line) && INSTALL_HEADING_PATTERN.test(line));
}

function buildInstallationSection(packageName: string): string {
  return wrapSection(
    "installation",
    `## Installation

\`\`\`sh
npm install ${packageName}
\`\`\``
  );
}

function buildContributingSection(contributingPath: string, readmePath: string): string {
  const linkTarget = relativeRepoPath(readmePath, contributingPath);

  return wrapSection(
    "contributing",
    `## Contributing

See [CONTRIBUTING.md](${linkTarget}) for development setup and pull request guidelines.`
  );
}

function buildLicenseSection(licenseLabel: string, licensePath: string, readmePath: string): string {
  const linkTarget = relativeRepoPath(readmePath, licensePath);

  return wrapSection(
    "license",
    `## License

[${licenseLabel}](${linkTarget})`
  );
}

export async function planSafeFixes(context: ApplyFixesContext): Promise<SafeFix[]> {
  const fixes: SafeFix[] = [];
  const lines = linesOf(context.markdown);
  const pkg = await readPackageJson(context.repoRoot);

  if (findingFailed(context.report, "installation") && typeof pkg?.name === "string" && pkg.name.trim() && !hasInstallHeading(context.markdown)) {
    fixes.push({
      id: "installation",
      section: buildInstallationSection(pkg.name.trim()),
      insertAt: insertAfterDescription([...lines])
    });
  }

  const contributingPath = join(context.repoRoot, "CONTRIBUTING.md");

  if (findingFailed(context.report, "contributing") && (await fileExists(contributingPath))) {
    fixes.push({
      id: "contributing",
      section: buildContributingSection(contributingPath, context.readmePath),
      insertAt: insertBeforeLicenseOrEnd([...lines])
    });
  }

  const licensePath = await findLicenseFile(context.repoRoot);

  if (findingFailed(context.report, "license") && licensePath) {
    const licenseLabel = await inferLicenseLabel(context.repoRoot, licensePath, pkg);

    fixes.push({
      id: "license",
      section: buildLicenseSection(licenseLabel, licensePath, context.readmePath),
      insertAt: insertBeforeLicenseOrEnd([...lines])
    });
  }

  const documentOrder: Record<SafeFixId, number> = {
    installation: 0,
    contributing: 1,
    license: 2
  };

  return fixes.sort((left, right) => documentOrder[left.id] - documentOrder[right.id]);
}

export function applySafeFixes(markdown: string, fixes: SafeFix[]): string {
  if (fixes.length === 0) {
    return markdown;
  }

  const lines = linesOf(markdown);
  const applyOrder: Record<SafeFixId, number> = {
    installation: 0,
    contributing: 1,
    license: 2
  };
  const orderedFixes = [...fixes].sort((left, right) => {
    if (right.insertAt !== left.insertAt) {
      return right.insertAt - left.insertAt;
    }

    return applyOrder[right.id] - applyOrder[left.id];
  });

  for (const fix of orderedFixes) {
    const block = fix.section.split("\n");
    const prefix = fix.insertAt === 0 || lines[fix.insertAt - 1]?.trim() === "" ? [] : [""];
    const suffix = fix.insertAt === lines.length || lines[fix.insertAt]?.trim() === "" ? [] : [""];

    lines.splice(fix.insertAt, 0, ...prefix, ...block, ...suffix);
  }

  const result = lines.join("\n");

  if (markdown.endsWith("\n") || fixes.length > 0) {
    return `${result.replace(/\n+$/, "")}\n`;
  }

  return result;
}

export function formatUnifiedDiff(filePath: string, before: string, after: string): string {
  if (before === after) {
    return "";
  }

  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const header = [`--- a/${basename(filePath)}`, `+++ b/${basename(filePath)}`];
  const hunkLines: string[] = [];
  const maxLength = Math.max(beforeLines.length, afterLines.length);
  let start = 0;

  while (start < maxLength && beforeLines[start] === afterLines[start]) {
    start += 1;
  }

  let endBefore = beforeLines.length;
  let endAfter = afterLines.length;

  while (
    endBefore > start &&
    endAfter > start &&
    beforeLines[endBefore - 1] === afterLines[endAfter - 1]
  ) {
    endBefore -= 1;
    endAfter -= 1;
  }

  const removed = beforeLines.slice(start, endBefore);
  const added = afterLines.slice(start, endAfter);
  const oldCount = removed.length;
  const newCount = added.length;

  hunkLines.push(`@@ -${start + 1},${oldCount} +${start + 1},${newCount} @@`);

  for (const line of removed) {
    hunkLines.push(`-${line}`);
  }

  for (const line of added) {
    hunkLines.push(`+${line}`);
  }

  return [...header, ...hunkLines, ""].join("\n");
}

export async function prepareApplyFixes(
  repoRoot: string,
  readmePath: string,
  markdown: string,
  report?: HealthReport
): Promise<ApplyFixesResult> {
  const resolvedReport = report ?? analyzeMarkdown(markdown, readmePath);
  const fixes = await planSafeFixes({
    repoRoot,
    readmePath,
    markdown,
    report: resolvedReport
  });
  const updated = applySafeFixes(markdown, fixes);

  return {
    fixes,
    markdown: updated,
    changed: updated !== markdown
  };
}

export function formatApplyFixesSummary(result: ApplyFixesResult): string {
  if (!result.changed) {
    return "No README fixes to apply.\n";
  }

  const titles: Record<SafeFixId, string> = {
    installation: "Installation",
    contributing: "Contributing",
    license: "License"
  };

  const lines = result.fixes
    .slice()
    .reverse()
    .map((fix) => `- ${titles[fix.id]}`);

  return ["README fixes to apply:", ...lines, ""].join("\n");
}

export function isSafeFixFinding(finding: Finding): finding is Finding & { id: SafeFixId } {
  return finding.id === "installation" || finding.id === "contributing" || finding.id === "license";
}
