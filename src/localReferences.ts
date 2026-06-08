import { access } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

import type { Finding, ReadmeFacts } from "./types.js";

type LocalReference = {
  kind: "link" | "image";
  url: string;
  targetPath: string;
};

function stripAnchorAndQuery(url: string): string {
  return url.split(/[?#]/, 1)[0]?.trim() ?? "";
}

function isSpecialOrRemoteUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//");
}

function toLocalReference(kind: LocalReference["kind"], url: string): LocalReference | undefined {
  const targetPath = stripAnchorAndQuery(url);

  if (!targetPath || targetPath.startsWith("#") || isSpecialOrRemoteUrl(targetPath) || isAbsolute(targetPath)) {
    return undefined;
  }

  return {
    kind,
    url,
    targetPath
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function evaluateLocalReferences(
  facts: Pick<ReadmeFacts, "links" | "images">,
  readmePath: string
): Promise<Finding> {
  const readmeDirectory = dirname(readmePath);
  const references = [
    ...facts.links.map((link) => toLocalReference("link", link.url)),
    ...facts.images.map((image) => toLocalReference("image", image.url))
  ].filter((reference): reference is LocalReference => Boolean(reference));

  const missing: LocalReference[] = [];

  for (const reference of references) {
    if (!(await exists(resolve(readmeDirectory, reference.targetPath)))) {
      missing.push(reference);
    }
  }

  if (missing.length > 0) {
    const missingPaths = [...new Set(missing.map((reference) => reference.targetPath))].slice(0, 5);

    return {
      id: "local-references",
      title: "Local References",
      status: "warn",
      points: 0,
      maxPoints: 0,
      message: `${missing.length} local reference${missing.length === 1 ? "" : "s"} do not resolve.`,
      suggestion: `Create or fix these relative paths: ${missingPaths.join(", ")}.`
    };
  }

  if (references.length === 0) {
    return {
      id: "local-references",
      title: "Local References",
      status: "pass",
      points: 0,
      maxPoints: 0,
      message: "No relative local references to validate.",
      suggestion: "Add relative links or images when they help readers navigate project docs."
    };
  }

  return {
    id: "local-references",
    title: "Local References",
    status: "pass",
    points: 0,
    maxPoints: 0,
    message: "All relative local references resolve.",
    suggestion: "Keep local docs and image paths in sync when files move."
  };
}
