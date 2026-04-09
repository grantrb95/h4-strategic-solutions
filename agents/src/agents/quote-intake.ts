/**
 * Quote Intake Agent — Processes freight quote requests
 *
 * Parses incoming requests, extracts structured data, and submits
 * to the H-4 dispatch system via the custom submit_quote tool.
 *
 * Usage: npm run quote-intake
 *   Then type a freight request (or paste an email/form submission).
 */

import { getClient } from "../client.js";
import { loadEnv, requireConfig } from "../config.js";
import { sendAndStream } from "../stream-helpers.js";
import { createInterface } from "readline";

loadEnv();
const client = getClient();

async function main() {
  const environmentId = requireConfig("ENVIRONMENT_ID");
  const agentId = requireConfig("AGENT_ID_QUOTE_INTAKE");

  console.log("=== H-4 Quote Intake Agent ===");
  console.log("Paste a freight request, email, or form submission.\n");

  // Create a session for this interaction
  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    title: `Quote Intake — ${new Date().toISOString().slice(0, 10)}`,
  });
  console.log(`Session: ${session.id}\n`);

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
      onToolUse: async (call) => {
        if (call.tool_name === "submit_quote") {
          console.log("\n\n--- QUOTE SUBMITTED TO DISPATCH ---");
          console.log(JSON.stringify(call.input, null, 2));
          console.log("-----------------------------------\n");
          // In production, this would call your dispatch API
          return JSON.stringify({
            status: "received",
            quote_id: `H4-${Date.now()}`,
            message: "Quote submitted to H-4 dispatch system.",
          });
        }
        return `Unknown tool: ${call.tool_name}`;
      },
    });
    console.log();
  }

  // Clean up
  console.log("\nArchiving session...");
  await client.beta.sessions.archive(session.id);
  console.log("Done.");
  rl.close();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
