import { runInstaller } from "./installer/index.js";

const SUPPORTED_PLATFORMS = ["claude-code", "opencode"] as const;
type Platform = (typeof SUPPORTED_PLATFORMS)[number];

function printHelp(): void {
  process.stderr.write(`
web-research-toolkit v0.1.0 — Agent installer for web-research-mcp

Usage:
  web-research-toolkit install <platform>       Install agents & skills for a platform

Platforms:
  claude-code    Install for Claude Code (writes .claude-plugin/, agents/, skills/)
  opencode       Install for OpenCode (writes .opencode/agents/, .opencode/skills/)

Options:
  --help, -h     Show this help message
  --version, -v  Show version
\n`);
}

function printVersion(): void {
  process.stderr.write("web-research-toolkit v0.1.0\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle flags
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    printVersion();
    process.exit(0);
  }

  // Route to subcommand
  const command = args[0];

  if (command === "install") {
    const platform = args[1];

    if (!platform) {
      console.error("Error: Missing platform argument.");
      console.error("");
      console.error(
        "Usage: web-research-toolkit install <claude-code|opencode>",
      );
      console.error("");
      console.error("Platforms:");
      console.error("  claude-code    Install for Claude Code");
      console.error("  opencode       Install for OpenCode");
      process.exit(1);
    }

    if (!SUPPORTED_PLATFORMS.includes(platform as Platform)) {
      console.error(`Error: Unknown platform "${platform}".`);
      console.error("");
      console.error(`Supported platforms: ${SUPPORTED_PLATFORMS.join(", ")}`);
      process.exit(1);
    }

    await runInstaller(platform);
    return;
  }

  // Unknown or missing command
  console.error(
    `Unknown command: ${command || "(none)"}\n\nUsage: web-research-toolkit install <platform>`,
  );
  process.exit(1);
}

main().catch((error) => {
  process.stderr.write(
    `Fatal error: ${error instanceof Error ? error.stack || error.message : String(error)}\n`,
  );
  process.exit(1);
});
