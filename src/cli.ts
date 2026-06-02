#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Command, InvalidArgumentError, Option } from "commander";

import { analyzeReadme } from "./analyze.js";
import { formatText } from "./formatText.js";
import { ReadmeInputError } from "./types.js";

type CliOptions = {
  format: "text" | "json";
  failUnder?: number;
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
    .version("0.1.0")
    .argument("[path]", "path to a README file", "README.md")
    .addOption(
      new Option("--format <format>", "output format")
        .choices(["text", "json"])
        .default("text")
    )
    .option("--fail-under <score>", "exit 1 if the score is below this number", parseFailUnder)
    .option("--strict", "equivalent to --fail-under 85")
    .exitOverride()
    .configureOutput({
      writeOut: (text) => io.stdout(text),
      writeErr: (text) => io.stderr(text)
    })
    .action(async (targetPath: string, options: CliOptions) => {
      try {
        const absolutePath = resolve(io.cwd, targetPath);
        const report = await analyzeReadme(absolutePath);
        const threshold = options.strict ? 85 : options.failUnder;

        if (options.format === "json") {
          io.stdout(`${JSON.stringify(report, null, 2)}\n`);
        } else {
          io.stdout(formatText(report));
        }

        if (threshold !== undefined && report.score < threshold) {
          exitCode = 1;
        }
      } catch (error) {
        if (error instanceof ReadmeInputError) {
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
      return 2;
    }

    throw error;
  }
}

const isEntryPoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}
