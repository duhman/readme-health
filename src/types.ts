export type FindingStatus = "pass" | "warn" | "fail";

export type Grade = "excellent" | "good" | "needs-work" | "poor";

export type Finding = {
  id: string;
  title: string;
  status: FindingStatus;
  points: number;
  maxPoints: number;
  message: string;
  suggestion: string;
};

export type RuleWeights = Record<string, number>;

export type HealthReport = {
  filePath: string;
  score: number;
  maxScore: 100;
  grade: Grade;
  summary: {
    passed: number;
    warnings: number;
    failures: number;
  };
  findings: Finding[];
};

export type ReadmeFacts = {
  markdown: string;
  headings: Array<{
    depth: number;
    text: string;
  }>;
  paragraphs: string[];
  codeBlocks: Array<{
    lang?: string;
    value: string;
  }>;
  links: Array<{
    label: string;
    url: string;
  }>;
  images: Array<{
    alt?: string;
    url: string;
  }>;
};

export class ReadmeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReadmeInputError";
  }
}
