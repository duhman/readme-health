import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("daily maintenance workflow", () => {
  it("runs on a daily schedule and manual dispatch", async () => {
    const workflow = await readFile(".github/workflows/daily-maintenance.yml", "utf8");

    expect(workflow).toContain("schedule:");
    expect(workflow).toContain("cron: \"17 4 * * *\"");
    expect(workflow).toContain("workflow_dispatch:");
  });

  it("has permission to commit deterministic maintenance changes", async () => {
    const workflow = await readFile(".github/workflows/daily-maintenance.yml", "utf8");

    expect(workflow).toContain("permissions:");
    expect(workflow).toContain("contents: write");
  });

  it("updates dependencies, verifies the project, and only pushes real changes", async () => {
    const workflow = await readFile(".github/workflows/daily-maintenance.yml", "utf8");

    expect(workflow).toContain("npm update --package-lock-only");
    expect(workflow).toContain("npm audit fix --package-lock-only");
    expect(workflow).toContain("npm run typecheck");
    expect(workflow).toContain("npm test");
    expect(workflow).toContain("npm run build");
    expect(workflow).toContain("node dist/cli.js README.md --strict");
    expect(workflow).toContain("git diff --quiet");
    expect(workflow).toContain("git commit -m \"chore: daily maintenance\"");
    expect(workflow).toContain("git push origin main");
  });
});
