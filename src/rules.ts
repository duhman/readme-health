import type { Finding, ReadmeFacts } from "./types.js";

type Rule = {
  id: string;
  title: string;
  maxPoints: number;
  evaluate: (facts: ReadmeFacts) => Omit<Finding, "id" | "title" | "maxPoints">;
};

const sectionPattern = (name: RegExp) => (facts: ReadmeFacts) =>
  facts.headings.some((heading) => name.test(heading.text));

const textPattern = (pattern: RegExp) => (facts: ReadmeFacts) =>
  pattern.test(facts.markdown);

function finding(
  status: Finding["status"],
  points: number,
  message: string,
  suggestion: string
): Omit<Finding, "id" | "title" | "maxPoints"> {
  return {
    status,
    points,
    message,
    suggestion
  };
}

const hasInstallSection = sectionPattern(
  /\b(install|installation|getting started|setup|quick start)\b/i
);
const hasInstallCommand = textPattern(
  /\b(npm install|pnpm add|yarn add|pip install|brew install|cargo install|go install|docker run)\b/i
);
const hasUsageSection = sectionPattern(/\b(usage|example|examples|cli|how to use)\b/i);
const hasTestSection = sectionPattern(/\b(test|tests|testing|verification|quality|check)\b/i);
const hasTestCommand = textPattern(/\b(npm test|npm run test|pnpm test|yarn test|pytest|go test|cargo test|dotnet test)\b/i);
const hasContributingSection = sectionPattern(/\b(contributing|contribution|development|local development)\b/i);
const hasLicenseSection = sectionPattern(/\blicen[cs]e\b/i);
const hasLicenseText = textPattern(/\b(MIT|Apache-2\.0|BSD-3-Clause|BSD-2-Clause|GPL-3\.0|MPL-2\.0|ISC)\b/i);

export const rules: Rule[] = [
  {
    id: "title",
    title: "Title",
    maxPoints: 10,
    evaluate: (facts) => {
      const h1s = facts.headings.filter((heading) => heading.depth === 1);

      if (h1s.length === 1 && h1s[0]?.text.trim()) {
        return finding("pass", 10, "README has one H1 heading.", "Keep the single H1 as the project name.");
      }

      if (h1s.length === 0) {
        return finding("fail", 0, "README has no H1 heading.", "Add a single H1 title at the top, for example `# Project Name`.");
      }

      return finding("fail", 0, `README has ${h1s.length} H1 headings.`, "Keep exactly one H1 and make later sections H2 or deeper.");
    }
  },
  {
    id: "description",
    title: "Description",
    maxPoints: 10,
    evaluate: (facts) => {
      const firstUsefulParagraph = facts.paragraphs.find((paragraph) => paragraph.length >= 20);

      if (!firstUsefulParagraph) {
        return finding("fail", 0, "README does not explain what the project does.", "Add a short project description below the title.");
      }

      if (firstUsefulParagraph.length < 80) {
        return finding("warn", 6, "Project description is present but thin.", "Expand the opening paragraph with who the project is for and what problem it solves.");
      }

      return finding("pass", 10, "README has a useful project description near the top.", "Keep the description focused on purpose and audience.");
    }
  },
  {
    id: "installation",
    title: "Installation",
    maxPoints: 10,
    evaluate: (facts) => {
      if (hasInstallSection(facts) || hasInstallCommand(facts)) {
        return finding("pass", 10, "README explains how to install the project.", "Keep installation commands copy-pasteable.");
      }

      return finding("fail", 0, "README is missing installation instructions.", "Add an Installation or Getting Started section.");
    }
  },
  {
    id: "usage",
    title: "Usage",
    maxPoints: 12,
    evaluate: (facts) => {
      if (hasUsageSection(facts)) {
        return finding("pass", 12, "README explains how to use the project.", "Keep usage examples runnable.");
      }

      return finding("fail", 0, "README is missing usage instructions.", "Add a Usage section with a runnable example.");
    }
  },
  {
    id: "code-examples",
    title: "Code Examples",
    maxPoints: 10,
    evaluate: (facts) => {
      if (facts.codeBlocks.length > 0) {
        return finding("pass", 10, `README has ${facts.codeBlocks.length} fenced code example${facts.codeBlocks.length === 1 ? "" : "s"}.`, "Keep examples short and runnable.");
      }

      return finding("fail", 0, "README has no fenced code examples.", "Add at least one fenced code block showing installation or usage.");
    }
  },
  {
    id: "code-fence-languages",
    title: "Code Fence Languages",
    maxPoints: 8,
    evaluate: (facts) => {
      if (facts.codeBlocks.length === 0) {
        return finding("warn", 0, "No fenced code blocks are available to inspect.", "Add fenced code examples with language tags like ```sh.");
      }

      const missingCount = facts.codeBlocks.filter((block) => !block.lang?.trim()).length;

      if (missingCount === 0) {
        return finding("pass", 8, "All fenced code blocks declare a language.", "Keep language tags so GitHub syntax highlighting works.");
      }

      const points = Math.round(8 * ((facts.codeBlocks.length - missingCount) / facts.codeBlocks.length));

      return finding("warn", points, `${missingCount} fenced code block${missingCount === 1 ? " is" : "s are"} missing languages.`, "Add a language after each opening fence, for example ```sh or ```ts.");
    }
  },
  {
    id: "license",
    title: "License",
    maxPoints: 8,
    evaluate: (facts) => {
      if (hasLicenseSection(facts) || hasLicenseText(facts)) {
        return finding("pass", 8, "README includes license information.", "Keep the README license aligned with the repository LICENSE file.");
      }

      return finding("fail", 0, "README does not mention a license.", "Add a License section and include the license name.");
    }
  },
  {
    id: "contributing",
    title: "Contributing",
    maxPoints: 7,
    evaluate: (facts) => {
      if (hasContributingSection(facts) || /contributions?\s+(are\s+)?welcome/i.test(facts.markdown)) {
        return finding("pass", 7, "README tells contributors how to participate.", "Keep contribution guidance short and specific.");
      }

      return finding("fail", 0, "README is missing contribution or development guidance.", "Add a Contributing or Development section.");
    }
  },
  {
    id: "tests",
    title: "Tests",
    maxPoints: 8,
    evaluate: (facts) => {
      if (hasTestSection(facts) || hasTestCommand(facts)) {
        return finding("pass", 8, "README explains how to test or verify the project.", "Keep test commands current with package scripts.");
      }

      return finding("fail", 0, "README does not explain how to run tests.", "Add a Tests or Verification section with the command.");
    }
  },
  {
    id: "link-labels",
    title: "Link Labels",
    maxPoints: 6,
    evaluate: (facts) => {
      const unlabeledCount = facts.links.filter((link) => link.label.trim().length === 0).length;

      if (unlabeledCount === 0) {
        return finding("pass", 6, "All Markdown links have readable labels.", "Keep link text descriptive.");
      }

      return finding("fail", 0, `${unlabeledCount} Markdown link${unlabeledCount === 1 ? " has" : "s have"} an empty label.`, "Replace empty labels with descriptive link text.");
    }
  },
  {
    id: "image-alt-text",
    title: "Image Alt Text",
    maxPoints: 5,
    evaluate: (facts) => {
      const missingAltCount = facts.images.filter((image) => !image.alt?.trim()).length;

      if (missingAltCount === 0) {
        return finding("pass", 5, "All images include alt text.", "Keep alt text concise and descriptive.");
      }

      return finding("fail", 0, `${missingAltCount} image${missingAltCount === 1 ? " is" : "s are"} missing alt text.`, "Add alt text inside the image brackets, for example `![CLI report](./report.png)`.");
    }
  },
  {
    id: "heading-order",
    title: "Heading Order",
    maxPoints: 6,
    evaluate: (facts) => {
      for (let index = 1; index < facts.headings.length; index += 1) {
        const previous = facts.headings[index - 1];
        const current = facts.headings[index];

        if (previous && current && current.depth > previous.depth + 1) {
          return finding("fail", 0, `Heading jumps from H${previous.depth} to H${current.depth} at "${current.text}".`, "Do not skip heading levels; use the next level down.");
        }
      }

      return finding("pass", 6, "Heading levels progress in order.", "Keep headings nested by one level at a time.");
    }
  }
];

export function evaluateRules(facts: ReadmeFacts): Finding[] {
  return rules.map((rule) => {
    const result = rule.evaluate(facts);
    return {
      id: rule.id,
      title: rule.title,
      maxPoints: rule.maxPoints,
      ...result,
      points: Math.max(0, Math.min(rule.maxPoints, result.points))
    };
  });
}
