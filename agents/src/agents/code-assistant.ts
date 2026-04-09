/**
 * Code Assistant Agent — Works on the H-4 website codebase
 *
 * Mounts the GitHub repo into the session container and uses
 * GitHub MCP for PR creation. Can edit code, run commands, and push changes.
 *
 * Usage: npm run code-assistant
 *   Then describe the feature, bug fix, or change you need.
 *
 * Requires:
 *   - GITHUB_TOKEN in .env (PAT with Contents: Read and write)
 *   - A vault with GitHub MCP OAuth credentials (for PR creation)
 */

import { getClient } from "../client.js";
import { loadEnv, requireConfig } from "../config.js";
import { sendAndStream } from "../stream-helpers.js";
import { createInterface } from "readline";

loadEnv();
const client = getClient();

async function main() {
  const environmentId = requireConfig("ENVIRONMENT_ID");
  const agentId = requireConfig("AGENT_ID_CODE_ASSISTANT");

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error("Missing GITHUB_TOKEN in .env. Needed to mount the repo.");
    process.exit(1);
  }

  console.log("=== H-4 Code Assistant Agent ===");
  console.log("The H-4 website repo will be mounted at /workspace/h4-strategic-solutions");
  console.log("Describe features, bugs, or changes you need.\n");

  // Attach GitHub MCP vault if configured (enables PR creation)
  const vaultId = process.env.VAULT_ID_GITHUB;
  if (vaultId) {
    console.log("GitHub MCP vault detected — PR creation enabled.");
  } else {
    console.log("No VAULT_ID_GITHUB in .env — PR creation disabled (run setup-vault.ts).");
  }

  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    title: `Code Assistant — ${new Date().toISOString().slice(0, 10)}`,
    ...(vaultId ? { vault_ids: [vaultId] } : {}),
    resources: [
      {
        type: "github_repository",
        url: "https://github.com/grantrb95/h4-strategic-solutions",
        authorization_token: githubToken,
        mount_path: "/workspace/h4-strategic-solutions",
        checkout: { type: "branch", name: "main" },
      },
    ],
  });
  console.log(`Session: ${session.id}`);
  console.log("Repo mounted. Ready.\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const prompt = (): Promise<string> =>
    new Promise((resolve) => rl.question("\n[You] ", resolve));

  while (true) {
    const input = await prompt();
    if (!input.trim()) continue;
    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") break;

    console.log("\n[Agent]");
    await sendAndStream(client, session.id, input, {
      onText: (text) => process.stdout.write(text),
    });
    console.log();
  }

  console.log("\nArchiving session...");
  await client.beta.sessions.archive(session.id);
  console.log("Done.");
  rl.close();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
