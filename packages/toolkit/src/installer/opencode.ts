import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  readBundledFile,
  assembleFile,
  AGENTS,
  SKILLS,
} from "./assembler.js";

/**
 * The MCP entry that should appear in opencode.json under "mcp".
 */
const OPENCODE_MCP_ENTRY = {
  type: "local" as const,
  command: ["npx", "-y", "web-research-mcp"],
};

/**
 * Strip single-line JSONC comments (// ...) so JSON.parse can handle the file.
 * Preserves strings that contain // (e.g. URLs) by only stripping comments
 * that appear outside of quoted strings.
 */
function stripJsoncComments(text: string): string {
  // Replace // comments that are NOT inside strings
  // Strategy: match strings first (to skip them), then match comments
  return text.replace(
    /"(?:[^"\\]|\\.)*"|\/\/[^\n]*/g,
    (match) => (match.startsWith('"') ? match : ""),
  );
}

/**
 * Read, merge, and write opencode.json with the web-research MCP entry.
 *
 * - If opencode.json exists: parse it, add/update mcp.web-research, write back
 * - If it doesn't exist: create it with the MCP entry and $schema
 */
function writeOpenCodeConfig(cwd: string): void {
  const configPath = join(cwd, "opencode.json");

  let config: Record<string, unknown>;

  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, "utf-8");
    const cleaned = stripJsoncComments(raw);
    config = JSON.parse(cleaned) as Record<string, unknown>;
  } else {
    config = { $schema: "https://opencode.ai/config.json" };
  }

  // Ensure mcp object exists and add/update the web-research entry
  if (typeof config.mcp !== "object" || config.mcp === null) {
    config.mcp = {};
  }
  (config.mcp as Record<string, unknown>)["web-research"] = OPENCODE_MCP_ENTRY;

  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

/**
 * Install web-research-mcp agents and skills for OpenCode.
 *
 * Writes to the current working directory:
 * - opencode.json (MCP server config — created or merged)
 * - .opencode/agents/{name}.md
 * - .opencode/skills/{name}/SKILL.md
 */
export async function installOpenCode(): Promise<void> {
  const cwd = process.cwd();
  console.log(`Installing web-research-mcp for OpenCode in ${cwd}...\n`);

  // Read templates
  const agentFrontmatter = readBundledFile("templates/opencode/agent.yaml");
  const skillFrontmatter = readBundledFile("templates/opencode/skill.yaml");

  // Write/merge opencode.json with MCP config
  writeOpenCodeConfig(cwd);
  console.log("  ✅ MCP server configured in opencode.json");

  // Write agents
  const agentsDir = join(cwd, ".opencode", "agents");
  mkdirSync(agentsDir, { recursive: true });
  for (const agent of AGENTS) {
    const body = readBundledFile(`prompts/${agent.promptPath}`);
    const assembled = assembleFile(agentFrontmatter, body, {
      name: agent.name,
      description: agent.description,
    });
    writeFileSync(join(agentsDir, `${agent.name}.md`), assembled);
    console.log(`  Created .opencode/agents/${agent.name}.md`);
  }

  // Write skills
  for (const skill of SKILLS) {
    const body = readBundledFile(`prompts/${skill.promptPath}`);
    const assembled = assembleFile(skillFrontmatter, body, {
      name: skill.name,
      description: skill.description,
    });
    const skillDir = join(cwd, ".opencode", "skills", skill.name);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), assembled);
    console.log(`  Created .opencode/skills/${skill.name}/SKILL.md`);
  }

  // Success message
  console.log(`
Done! Installed for OpenCode:
  - opencode.json (MCP server config)
  - .opencode/agents/web-searcher.md
  - .opencode/agents/deep-researcher.md
  - .opencode/skills/web-search/SKILL.md
  - .opencode/skills/deep-research/SKILL.md

Restart OpenCode to pick up the new agents and skills.
`);
}
