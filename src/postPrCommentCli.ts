#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { Command } from "commander";

import { formatPrComment } from "./formatPrComment.js";
import type { HealthReport } from "./types.js";

type CliOptions = {
  head: string;
  base?: string;
  threshold: number;
  readme: string;
};

async function readReport(path: string | undefined): Promise<HealthReport | undefined> {
  if (!path) {
    return undefined;
  }

  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as HealthReport;
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("readme-health-pr-comment")
    .description("Format a sticky pull request comment from README Health JSON reports")
    .requiredOption("--head <path>", "path to the head branch JSON report")
    .option("--base <path>", "path to the base branch JSON report")
    .option("--threshold <score>", "pass/fail threshold", (value) => Number(value), 80)
    .option("--readme <path>", "README path shown in the comment", "README.md")
    .action(async (options: CliOptions) => {
      const headReport = await readReport(options.head);

      if (!headReport) {
        throw new Error(`Could not read head report at ${options.head}`);
      }

      const baseReport = await readReport(options.base);
      const comment = formatPrComment({
        report: headReport,
        baseScore: baseReport?.score,
        threshold: options.threshold,
        readmePath: options.readme
      });

      process.stdout.write(comment);
    });

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
