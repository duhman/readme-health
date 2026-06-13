import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { rules } from "./rules.js";
import type { RuleWeights } from "./types.js";

export const configFileName = "readme-health.config.json";

export type ReadmeHealthConfig = {
  failUnder?: number;
  ruleWeights?: RuleWeights;
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const scoredRuleIds = new Set(rules.map((rule) => rule.id));

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseConfig(rawConfig: string, configPath: string): unknown {
  try {
    return JSON.parse(rawConfig);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Invalid config in ${configPath}: ${message}`);
  }
}

function validateFailUnder(value: unknown, configPath: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
    throw new ConfigError(`Invalid config in ${configPath}: failUnder must be an integer from 0 to 100.`);
  }

  return value;
}

function validateRuleWeights(value: unknown, configPath: string): RuleWeights {
  if (!isPlainObject(value)) {
    throw new ConfigError(`Invalid config in ${configPath}: ruleWeights must be an object.`);
  }

  const ruleWeights: RuleWeights = {};

  for (const [ruleId, weight] of Object.entries(value)) {
    if (!scoredRuleIds.has(ruleId)) {
      throw new ConfigError(
        `Invalid config in ${configPath}: Unknown rule weight "${ruleId}". Use an existing scored rule ID.`
      );
    }

    if (typeof weight !== "number" || !Number.isInteger(weight) || weight <= 0) {
      throw new ConfigError(
        `Invalid config in ${configPath}: ruleWeights.${ruleId} must be a positive integer.`
      );
    }

    ruleWeights[ruleId] = weight;
  }

  return ruleWeights;
}

export async function loadConfig(cwd: string): Promise<ReadmeHealthConfig> {
  const configPath = resolve(cwd, configFileName);
  let rawConfig: string;

  try {
    rawConfig = await readFile(configPath, "utf8");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return {};
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Invalid config in ${configPath}: ${message}`);
  }

  const parsedConfig = parseConfig(rawConfig, configPath);

  if (!isPlainObject(parsedConfig)) {
    throw new ConfigError(`Invalid config in ${configPath}: expected a JSON object.`);
  }

  const config: ReadmeHealthConfig = {};

  if ("failUnder" in parsedConfig) {
    config.failUnder = validateFailUnder(parsedConfig.failUnder, configPath);
  }

  if ("ruleWeights" in parsedConfig) {
    config.ruleWeights = validateRuleWeights(parsedConfig.ruleWeights, configPath);
  }

  return config;
}
