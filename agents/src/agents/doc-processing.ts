/**
 * Document Processing Agent — Parse freight logistics documents
 *
 * Handles BOLs, rate confirmations, invoices, and PODs.
 * Upload files to the session and ask the agent to process them.
 *
 * Usage: npm run doc-processing
 *   Then describe or paste document content for processing.
 */

import { getClient } from "../client.js";
import { loadEnv, requireConfig } from "../config.js";
import { sendAndStream } from "../stream-helpers.js";
import { createInterface } from "readline";
import { existsSync, createReadStream } from "fs";

loadEnv();
const client = getClient();

async function main() {
  const environmentId = requireConfig("ENVIRONMENT_ID");
  const agentId = requireConfig("AGENT_ID_DOC_PROCESSING");

  console.log("=== H-4 Document Processing Agent ===");
  console.log("Commands:");
  console.log("  /upload <path>  — Upload a file (PDF, XLSX, CSV, etc.)");
  console.log("  /list           — List session files");
  console.log("  exit            — End session\n");
  console.log("Paste document text or upload files for processing.\n");

  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    title: `Doc Processing — ${new Date().toISOString().slice(0, 10)}`,
  });
  console.log(`Session: ${session.id}\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const prompt = (): Promise<string> =>
    new Promise((resolve) => rl.question("\n[You] ", resolve));

  while (true) {
    const input = await prompt();
    if (!input.trim()) continue;
    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") break;

    // Handle /upload command
    if (input.startsWith("/upload ")) {
      const filePath = input.slice(8).trim();
      if (!existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        continue;
      }
      console.log(`Uploading ${filePath}...`);
      const file = await client.beta.files.upload({
        file: createReadStream(filePath),
      });
      // Attach to session as a resource
      await client.beta.sessions.resources.add(session.id, {
        type: "file",
        file_id: file.id,
        mount_path: `/workspace/${filePath.split("/").pop()}`,
      });
      console.log(`Uploaded and mounted: ${file.id}`);
      continue;
    }

    // Handle /list command
    if (input.trim() === "/list") {
      const files = await client.beta.files.list({ scope: session.id });
      if (files.data.length === 0) {
        console.log("No output files yet.");
      } else {
        for (const f of files.data) {
          console.log(`  ${f.id}: ${f.filename} (${f.size_bytes} bytes)`);
        }
      }
      continue;
    }

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
