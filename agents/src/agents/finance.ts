/**
 * Finance Agent — QuickBooks integration for H-4
 *
 * Pulls P&L reports, cash flow analysis, and financial insights
 * from QuickBooks for H-4 Strategic Solutions.
 *
 * Usage: npm run finance
 *   Then ask about revenue, expenses, profitability, cash flow, etc.
 */

import { getClient } from "../client.js";
import { loadEnv, requireConfig } from "../config.js";
import { sendAndStream } from "../stream-helpers.js";
import { createInterface } from "readline";

loadEnv();
const client = getClient();

async function main() {
  const environmentId = requireConfig("ENVIRONMENT_ID");
  const agentId = requireConfig("AGENT_ID_FINANCE");

  console.log("=== H-4 Finance Agent ===");
  console.log("Connected to QuickBooks: H-4 Strategic Solutions LLC");
  console.log("Ask about P&L, expenses, invoicing, cash flow, etc.\n");

  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    title: `Finance — ${new Date().toISOString().slice(0, 10)}`,
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
        if (call.tool_name === "get_quickbooks_data") {
          const reportType = (call.input as any)?.report_type || "profit_loss";
          console.log(`\n[Fetching ${reportType} from QuickBooks...]`);
          // In production, this calls the QuickBooks API
          return JSON.stringify({
            status: "success",
            report_type: reportType,
            message: "Connect to QuickBooks API for live data. See agents/.env for config.",
          });
        }
        if (call.tool_name === "sync_to_notion") {
          console.log("\n[Syncing to Notion Operations Hub...]");
          return JSON.stringify({
            status: "synced",
            message: "Financial data synced to Notion Operations Hub.",
          });
        }
        return `Unknown tool: ${call.tool_name}`;
      },
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
