import { readFile } from "node:fs/promises";

import type { Code, Heading, Image, Link, Paragraph, Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import { evaluateLocalReferences } from "./localReferences.js";
import { evaluateRules } from "./rules.js";
import type { Finding, Grade, HealthReport, ReadmeFacts } from "./types.js";
import { ReadmeInputError } from "./types.js";

type NodeWithChildren = {
  children?: unknown[];
  value?: unknown;
  alt?: unknown;
};

function isHeading(node: unknown): node is Heading {
  return isNodeType(node, "heading");
}

function isParagraph(node: unknown): node is Paragraph {
  return isNodeType(node, "paragraph");
}

function isCode(node: unknown): node is Code {
  return isNodeType(node, "code");
}

function isLink(node: unknown): node is Link {
  return isNodeType(node, "link");
}

function isImage(node: unknown): node is Image {
  return isNodeType(node, "image");
}

function isNodeType(node: unknown, type: string): boolean {
  return typeof node === "object" && node !== null && "type" in node && node.type === type;
}

function textContent(node: unknown): string {
  if (typeof node !== "object" || node === null) {
    return "";
  }

  const typedNode = node as NodeWithChildren;

  if (typeof typedNode.value === "string") {
    return typedNode.value;
  }

  if (typeof typedNode.alt === "string") {
    return typedNode.alt;
  }

  if (Array.isArray(typedNode.children)) {
    return typedNode.children.map((child) => textContent(child)).join("");
  }

  return "";
}

function gradeFor(score: number): Grade {
  if (score >= 90) {
    return "excellent";
  }

  if (score >= 75) {
    return "good";
  }

  if (score >= 50) {
    return "needs-work";
  }

  return "poor";
}

function collectFacts(markdown: string): ReadmeFacts {
  const processor = unified().use(remarkParse).use(remarkGfm);
  const tree = processor.parse(markdown) as Root;
  const facts: ReadmeFacts = {
    markdown,
    headings: [],
    paragraphs: [],
    codeBlocks: [],
    links: [],
    images: []
  };

  visit(tree, (node) => {
    if (isHeading(node)) {
      facts.headings.push({
        depth: node.depth,
        text: textContent(node).trim()
      });
      return;
    }

    if (isParagraph(node)) {
      const text = textContent(node).replace(/\s+/g, " ").trim();
      if (text.length > 0) {
        facts.paragraphs.push(text);
      }
      return;
    }

    if (isCode(node)) {
      facts.codeBlocks.push({
        lang: node.lang ?? undefined,
        value: node.value
      });
      return;
    }

    if (isLink(node)) {
      facts.links.push({
        label: textContent(node).replace(/\s+/g, " ").trim(),
        url: node.url
      });
      return;
    }

    if (isImage(node)) {
      facts.images.push({
        alt: node.alt ?? undefined,
        url: node.url
      });
    }
  });

  return facts;
}

function createReport(filePath: string, findings: Finding[]): HealthReport {
  const score = Math.round(
    findings.reduce((total, item) => total + item.points, 0)
  );

  return {
    filePath,
    score,
    maxScore: 100,
    grade: gradeFor(score),
    summary: {
      passed: findings.filter((item) => item.status === "pass").length,
      warnings: findings.filter((item) => item.status === "warn").length,
      failures: findings.filter((item) => item.status === "fail").length
    },
    findings
  };
}

export function analyzeMarkdown(markdown: string, filePath: string): HealthReport {
  return createReport(filePath, evaluateRules(collectFacts(markdown)));
}

export async function analyzeReadme(filePath: string): Promise<HealthReport> {
  try {
    const markdown = await readFile(filePath, "utf8");
    const facts = collectFacts(markdown);
    return createReport(filePath, [
      ...evaluateRules(facts),
      await evaluateLocalReferences(facts, filePath)
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ReadmeInputError(`Unable to read ${filePath}: ${message}`);
  }
}
