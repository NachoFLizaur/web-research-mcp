import { installClaudeCode } from "./claude-code.js";
import { installOpenCode } from "./opencode.js";

export async function runInstaller(platform: string): Promise<void> {
  switch (platform) {
    case "claude-code":
      await installClaudeCode();
      break;
    case "opencode":
      await installOpenCode();
      break;
    default:
      console.error(`Unknown platform: ${platform}`);
      process.exit(1);
  }
}
