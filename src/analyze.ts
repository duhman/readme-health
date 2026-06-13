import { readFile } from "node:fs/promises";

import type { Code, Heading, Image, Link, Paragraph, Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import { evaluateLocalReferences } from "./localReferences.js";
import { evaluateRules } from "./rules.js";
import type { Finding, Grade, HealthReport, ReadmeFacts, RuleWeights } from "./types.js";
import { ReadmeInputError } from "./types.js";

type NodeWithChildren = {
  children?: unknown[];
  value?: unknown;
  alt?: unknown;
};

type AnalyzeOptions = {
  ruleWeights?: RuleWeights;
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

function applyRuleWeights(findings: Finding[], ruleWeights: RuleWeights = {}): Finding[] {
  return findings.map((finding) => {
    const configuredMaxPoints = ruleWeights[finding.id];

    if (configuredMaxPoints === undefined || finding.maxPoints === 0) {
      return finding;
    }

    return {
      ...finding,
      points: Math.round(configuredMaxPoints * (finding.points / finding.maxPoints)),
      maxPoints: configuredMaxPoints
    };
  });
}

function createReport(filePath: string, findings: Finding[], options: AnalyzeOptions = {}): HealthReport {
  const weightedFindings = applyRuleWeights(findings, options.ruleWeights);
  const scoredFindings = weightedFindings.filter((item) => item.maxPoints > 0);
  const earnedPoints = scoredFindings.reduce((total, item) => total + item.points, 0);
  const possiblePoints = scoredFindings.reduce((total, item) => total + item.maxPoints, 0);
  const score = possiblePoints === 0 ? 0 : Math.round((earnedPoints / possiblePoints) * 100);

  return {
    filePath,
    score,
    maxScore: 100,
    grade: gradeFor(score),
    summary: {
      passed: weightedFindings.filter((item) => item.status === "pass").length,
      warnings: weightedFindings.filter((item) => item.status === "warn").length,
      failures: weightedFindings.filter((item) => item.status === "fail").length
    },
    findings: weightedFindings
  };
}

export function analyzeMarkdown(markdown: string, filePath: string, options: AnalyzeOptions = {}): HealthReport {
  return createReport(filePath, evaluateRules(collectFacts(markdown)), options);
}

export async function analyzeReadme(filePath: string, options: AnalyzeOptions = {}): Promise<HealthReport> {
  try {
    const markdown = await readFile(filePath, "utf8");
    const facts = collectFacts(markdown);
    return createReport(filePath, [
      ...evaluateRules(facts),
      await evaluateLocalReferences(facts, filePath)
    ], options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ReadmeInputError(`Unable to read ${filePath}: ${message}`);
  }
}
