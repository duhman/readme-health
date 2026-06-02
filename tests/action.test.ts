import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("GitHub Action wrapper", () => {
  it("exposes README path, format, strict, and fail-under inputs", async () => {
    const action = await readFile("action.yml", "utf8");

    expect(action).toContain("readme-path:");
    expect(action).toContain("format:");
    expect(action).toContain("fail-under:");
    expect(action).toContain("strict:");
  });

  it("declares Marketplace branding", async () => {
    const action = await readFile("action.yml", "utf8");

    expect(action).toContain("branding:");
    expect(action).toContain("icon: book-open");
    expect(action).toContain("color: green");
  });

  it("runs the built CLI from the action directory against the caller workspace", async () => {
    const action = await readFile("action.yml", "utf8");

    expect(action).toContain('npm ci --prefix "$GITHUB_ACTION_PATH"');
    expect(action).toContain('npm run build --prefix "$GITHUB_ACTION_PATH"');
    expect(action).toContain('node "$GITHUB_ACTION_PATH/dist/cli.js"');
    expect(action).toContain('"$GITHUB_WORKSPACE/$INPUT_README_PATH"');
  });

  it("uses the local action in CI so wrapper changes are exercised", async () => {
    const workflow = await readFile(".github/workflows/readme-health.yml", "utf8");

    expect(workflow).toContain("uses: ./");
    expect(workflow).toContain('strict: "true"');
  });

  it("uses current GitHub Actions runtime wrappers", async () => {
    const ciWorkflow = await readFile(".github/workflows/ci.yml", "utf8");
    const readmeWorkflow = await readFile(".github/workflows/readme-health.yml", "utf8");

    expect(ciWorkflow).toContain("actions/checkout@v6");
    expect(ciWorkflow).toContain("actions/setup-node@v6");
    expect(readmeWorkflow).toContain("actions/checkout@v6");
    expect(readmeWorkflow).toContain("actions/setup-node@v6");
  });
});
