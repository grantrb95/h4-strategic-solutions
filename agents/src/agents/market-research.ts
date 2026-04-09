/**
 * Market Research Agent — Freight market intelligence
 *
 * Searches the web for current freight rates, industry trends,
 * and competitive intelligence relevant to H-4's hotshot operations.
 *
 * Usage: npm run market-research
 *   Then ask about freight rates, lane profitability, market trends, etc.
 */

import { getClient } from "../client.js";
import { loadEnv, requireConfig } from "../config.js";
import { sendAndStream } from "../stream-helpers.js";
import { createInterface } from "readline";

loadEnv();
const client = getClient();

async function main() {
  const environmentId = requireConfig("ENVIRONMENT_ID");
  const agentId = requireConfig("AGENT_ID_MARKET_RESEARCH");

  console.log("=== H-4 Market Research Agent ===");
  console.log("Ask about freight rates, market trends, lane profitability, etc.\n");

  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    title: `Market Research — ${new Date().toISOString().slice(0, 10)}`,
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
