import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const CLI = "dist/cli.js";

async function runCli(
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await exec("node", [CLI, ...args]);
    return { stdout, stderr, exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      exitCode: error.code || 1,
    };
  }
}

describe("Toolkit CLI Routing", () => {
  // POSITIVE: --help flag shows usage information
  it("help flag shows usage", async () => {
    // Arrange & Act
    const result = await runCli("--help");
    // Assert
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Usage");
  });

  // POSITIVE: -h short flag also shows usage information
  it("short help flag shows usage", async () => {
    // Arrange & Act
    const result = await runCli("-h");
    // Assert
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Usage");
  });

  // POSITIVE: --version flag shows version string
  it("version flag shows version", async () => {
    // Arrange & Act
    const result = await runCli("--version");
    // Assert
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("web-research-toolkit");
  });

  // NEGATIVE: install without platform argument shows error
  it("install without platform shows error", async () => {
    // Arrange & Act
    const result = await runCli("install");
    // Assert
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Missing platform");
  });

  // NEGATIVE: install with invalid platform shows error
  it("install with invalid platform shows error", async () => {
    // Arrange & Act
    const result = await runCli("install", "gemini");
    // Assert
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown platform");
  });

  // POSITIVE: install claude-code routes correctly
  it("install claude-code runs", async () => {
    // Arrange & Act
    const result = await runCli("install", "claude-code");
    // Assert
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Claude Code");
  });

  // POSITIVE: install opencode routes correctly
  it("install opencode runs", async () => {
    // Arrange & Act
    const result = await runCli("install", "opencode");
    // Assert
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("opencode");
  });

  // NEGATIVE: unknown command shows error
  it("unknown command shows error", async () => {
    // Arrange & Act
    const result = await runCli("foobar");
    // Assert
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command");
  });

  // NEGATIVE: no args shows error (toolkit requires install subcommand)
  it("no args shows error", async () => {
    // Arrange & Act
    const result = await runCli();
    // Assert
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command");
  });

  // NEGATIVE: help text must not reference Codex CLI
  it("no codex in help", async () => {
    // Arrange & Act
    const result = await runCli("--help");
    // Assert
    expect(result.stderr.toLowerCase()).not.toContain("codex");
  });

  // NEGATIVE: help text must not reference Gemini CLI
  it("no gemini in help", async () => {
    // Arrange & Act
    const result = await runCli("--help");
    // Assert
    expect(result.stderr.toLowerCase()).not.toContain("gemini");
  });
});
