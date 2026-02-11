import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the package root (where prompts/ and templates/ live)
// When installed via npm, these are in the package directory.
// tsup bundles everything into dist/cli.js, so we go up one level.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = join(__dirname, "..");

/**
 * Read a bundled file from the package.
 */
export function readBundledFile(relativePath: string): string {
  const fullPath = join(PACKAGE_ROOT, relativePath);
  return readFileSync(fullPath, "utf-8");
}

/**
 * Replace {{placeholder}} tokens in a template string.
 */
export function replacePlaceholders(
  template: string,
  values: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

/**
 * Assemble a complete agent/skill file from frontmatter template + prompt body.
 *
 * Returns: `---\n{frontmatter}\n---\n\n{body}`
 */
export function assembleFile(
  frontmatterTemplate: string,
  promptBody: string,
  placeholders: Record<string, string>,
): string {
  const frontmatter = replacePlaceholders(frontmatterTemplate, placeholders);
  return `---\n${frontmatter}\n---\n\n${promptBody}`;
}

/** Agent/skill definitions for assembly */
export interface AgentDef {
  name: string;
  description: string;
  promptPath: string; // relative to prompts/ (e.g., "agents/web-searcher.md")
}

export const AGENTS: AgentDef[] = [
  {
    name: "web-searcher",
    description:
      "Quick web search — find URLs, snippets, and answers using DuckDuckGo",
    promptPath: "agents/web-searcher.md",
  },
  {
    name: "deep-researcher",
    description:
      "Deep web research — comprehensive multi-source research with query expansion and synthesis",
    promptPath: "agents/deep-researcher.md",
  },
];

export const SKILLS: AgentDef[] = [
  {
    name: "web-search",
    description:
      "Web search methodology — how to use search tools effectively",
    promptPath: "skills/web-search.md",
  },
  {
    name: "deep-research",
    description:
      "Deep research methodology — comprehensive research workflow with synthesis",
    promptPath: "skills/deep-research.md",
  },
];
