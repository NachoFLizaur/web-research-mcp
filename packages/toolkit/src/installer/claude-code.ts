import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  readBundledFile,
  assembleFile,
  AGENTS,
  SKILLS,
} from "./assembler.js";

/**
 * Install web-research-mcp agents and skills for Claude Code.
 *
 * Writes to the current working directory:
 * - .claude-plugin/plugin.json
 * - .mcp.json
 * - skills/{name}/SKILL.md
 * - agents/{name}.md
 */
export async function installClaudeCode(): Promise<void> {
  const cwd = process.cwd();
  console.log(`Installing web-research-mcp for Claude Code in ${cwd}...\n`);

  // Read templates
  const agentFrontmatter = readBundledFile("templates/claude-code/agent.yaml");
  const skillFrontmatter = readBundledFile("templates/claude-code/skill.yaml");
  const pluginJson = readBundledFile("templates/claude-code/plugin.json");
  const mcpJson = readBundledFile("templates/claude-code/mcp.json");

  // Write .claude-plugin/plugin.json
  const pluginDir = join(cwd, ".claude-plugin");
  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(join(pluginDir, "plugin.json"), pluginJson);
  console.log("  Created .claude-plugin/plugin.json");

  // Write .mcp.json
  writeFileSync(join(cwd, ".mcp.json"), mcpJson);
  console.log("  Created .mcp.json");

  // Write skills
  for (const skill of SKILLS) {
    const body = readBundledFile(`prompts/${skill.promptPath}`);
    const assembled = assembleFile(skillFrontmatter, body, {
      name: skill.name,
      description: skill.description,
    });
    const skillDir = join(cwd, "skills", skill.name);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), assembled);
    console.log(`  Created skills/${skill.name}/SKILL.md`);
  }

  // Write agents
  const agentsDir = join(cwd, "agents");
  mkdirSync(agentsDir, { recursive: true });
  for (const agent of AGENTS) {
    const body = readBundledFile(`prompts/${agent.promptPath}`);
    const assembled = assembleFile(agentFrontmatter, body, {
      name: agent.name,
      description: agent.description,
    });
    writeFileSync(join(agentsDir, `${agent.name}.md`), assembled);
    console.log(`  Created agents/${agent.name}.md`);
  }

  // Success message
  console.log(`
Done! Installed for Claude Code:
  - .claude-plugin/plugin.json (plugin manifest)
  - .mcp.json (MCP server config)
  - skills/web-search/SKILL.md
  - skills/deep-research/SKILL.md
  - agents/web-searcher.md
  - agents/deep-researcher.md

Next steps:
  1. Run 'claude plugin install .' to register the plugin
  2. Or just start using the agents — Claude Code will discover them automatically
`);
}
