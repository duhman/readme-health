#!/usr/bin/env node
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Command, InvalidArgumentError, Option } from "commander";

import packageJson from "../package.json" with { type: "json" };
import { analyzeReadme } from "./analyze.js";
import {
  formatApplyFixesSummary,
  formatUnifiedDiff,
  prepareApplyFixes
} from "./applyFixes.js";
import { ConfigError, loadConfig } from "./config.js";
import { formatGithub, formatGithubJobSummary } from "./formatGithub.js";
import { formatText } from "./formatText.js";
import { ReadmeInputError } from "./types.js";

type CliOptions = {
  format: "text" | "json" | "github";
  failUnder?: number;
  fixSuggestions?: boolean;
  applyFixes?: boolean;
  dryRun?: boolean;
  strict?: boolean;
};

type CliIO = {
  cwd?: string;
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
};

function parseFailUnder(value: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw new InvalidArgumentError("expected an integer from 0 to 100");
  }

  return parsed;
}

function createProgram(io: Required<CliIO>): {
  program: Command;
  getExitCode: () => number;
} {
  let exitCode = 0;
  const program = new Command();

  program
    .name("readme-health")
    .description("Score a local README for maintainer readiness")
    .version(packageJson.version)
    .argument("[path]", "path to a README file", "README.md")
    .addOption(
      new Option("--format <format>", "output format")
        .choices(["text", "json", "github"])
        .default("text")
    )
    .option("--fail-under <score>", "exit 1 if the score is below this number", parseFailUnder)
    .option("--fix-suggestions", "append copy-pasteable README fix snippets to text output")
    .option("--apply-fixes", "insert high-confidence missing README sections from repo files")
    .option("--dry-run", "preview README fix hunks without writing (requires --apply-fixes)")
    .option("--strict", "equivalent to --fail-under 85")
    .exitOverride()
    .configureOutput({
      writeOut: (text) => io.stdout(text),
      writeErr: (text) => io.stderr(text)
    })
    .action(async (targetPath: string, options: CliOptions) => {
      try {
        if (options.dryRun && !options.applyFixes) {
          io.stderr("--dry-run requires --apply-fixes.\n");
          exitCode = 2;
          return;
        }

        const absolutePath = resolve(io.cwd, targetPath);
        const config = await loadConfig(io.cwd);
        const report = await analyzeReadme(absolutePath, {
          ruleWeights: config.ruleWeights
        });
        const threshold = options.strict ? 85 : options.failUnder ?? config.failUnder;

        if (options.format === "json") {
          io.stdout(`${JSON.stringify(report, null, 2)}\n`);
        } else if (options.format === "github") {
          io.stdout(formatGithub(report));

          const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;

          if (stepSummaryPath) {
            await appendFile(stepSummaryPath, formatGithubJobSummary(report), "utf8");
          }
        } else {
          io.stdout(formatText(report, { includeFixSuggestions: options.fixSuggestions }));
        }

        if (options.applyFixes) {
          const originalMarkdown = await readFile(absolutePath, "utf8");
          const applyResult = await prepareApplyFixes(io.cwd, absolutePath, originalMarkdown, report);
          const applyOutput = formatApplyFixesSummary(applyResult);

          if (options.format === "text") {
            io.stdout(`\n${applyOutput}`);
          }

          if (applyResult.changed) {
            const diff = formatUnifiedDiff(absolutePath, originalMarkdown, applyResult.markdown);

            if (options.dryRun) {
              if (options.format === "text") {
                io.stdout(`${diff}`);
              }
            } else {
              await writeFile(absolutePath, applyResult.markdown, "utf8");

              if (options.format === "text") {
                io.stdout(`Applied README fixes to ${absolutePath}.\n`);
              }
            }
          } else if (options.format === "text" && options.dryRun) {
            io.stdout("");
          }
        }

        if (threshold !== undefined && report.score < threshold) {
          exitCode = 1;
        }
      } catch (error) {
        if (error instanceof ReadmeInputError || error instanceof ConfigError) {
          io.stderr(`${error.message}\n`);
          exitCode = 2;
          return;
        }

        throw error;
      }
    });

  return {
    program,
    getExitCode: () => exitCode
  };
}

export async function runCli(argv: string[], io: CliIO = {}): Promise<number> {
  const resolvedIo: Required<CliIO> = {
    cwd: io.cwd ?? process.cwd(),
    stdout: io.stdout ?? ((text) => process.stdout.write(text)),
    stderr: io.stderr ?? ((text) => process.stderr.write(text))
  };
  const { program, getExitCode } = createProgram(resolvedIo);

  try {
    await program.parseAsync(argv, { from: "user" });
    return getExitCode();
  } catch (error) {
    if (typeof error === "object" && error !== null && "exitCode" in error) {
      const exitCode = error.exitCode;
      return typeof exitCode === "number" && exitCode === 0 ? 0 : 2;
    }

    throw error;
  }
}

const isEntryPoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}
