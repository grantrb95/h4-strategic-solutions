/**
 * Document Batch Processor — Upload and process multiple freight documents
 *
 * Scans a directory for documents (PDFs, Excel files, CSVs), uploads them
 * to a Document Processing agent session, and extracts structured data.
 *
 * Usage: npx tsx src/agents/doc-batch.ts ./documents/
 *   Processes all supported files in the given directory.
 *
 * Output: Writes parsed results to ./doc-results/<filename>.json
 */

import { getClient } from "../client.js";
import { loadEnv, requireConfig } from "../config.js";
import { readdirSync, existsSync, mkdirSync, writeFileSync, createReadStream } from "fs";
import { join, extname, basename } from "path";

loadEnv();
const client = getClient();

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf", ".xlsx", ".xls", ".csv", ".txt", ".json", ".xml",
]);

async function main() {
  const inputDir = process.argv[2];
  if (!inputDir) {
    console.error("Usage: npx tsx src/agents/doc-batch.ts <directory>");
    console.error("  Processes all PDF, XLSX, CSV files in the directory.");
    process.exit(1);
  }

  if (!existsSync(inputDir)) {
    console.error(`Directory not found: ${inputDir}`);
    process.exit(1);
  }

  const environmentId = requireConfig("ENVIRONMENT_ID");
  const agentId = requireConfig("AGENT_ID_DOC_PROCESSING");

  // Find supported files
  const files = readdirSync(inputDir).filter((f) =>
    SUPPORTED_EXTENSIONS.has(extname(f).toLowerCase())
  );

  if (files.length === 0) {
    console.error(`No supported files found in ${inputDir}`);
    console.error(`Supported: ${[...SUPPORTED_EXTENSIONS].join(", ")}`);
    process.exit(1);
  }

  console.log(`=== H-4 Document Batch Processor ===`);
  console.log(`Found ${files.length} file(s) to process.\n`);

  // Create output directory
  const outputDir = "./doc-results";
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  // Create a session
  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    title: `Batch Processing — ${new Date().toISOString().slice(0, 10)} — ${files.length} files`,
  });
  console.log(`Session: ${session.id}\n`);

  // Upload all files
  console.log("Uploading files...");
  const uploadedFiles: Array<{ name: string; fileId: string }> = [];

  for (const fileName of files) {
    const filePath = join(inputDir, fileName);
    console.log(`  Uploading: ${fileName}`);

    const uploaded = await client.beta.files.upload({
      file: createReadStream(filePath),
    });

    await client.beta.sessions.resources.add(session.id, {
      type: "file",
      file_id: uploaded.id,
      mount_path: `/workspace/documents/${fileName}`,
    });

    uploadedFiles.push({ name: fileName, fileId: uploaded.id });
  }

  console.log(`\nAll ${uploadedFiles.length} files uploaded and mounted.\n`);

  // Send processing instruction
  const fileList = uploadedFiles.map((f) => `- /workspace/documents/${f.name}`).join("\n");

  const processingPrompt = `Process all ${uploadedFiles.length} freight documents in /workspace/documents/.

Files to process:
${fileList}

For EACH document:
1. Identify the document type (BOL, rate confirmation, invoice, POD, or other)
2. Extract all structured data fields
3. Flag any missing or suspicious values
4. Output the extracted data as JSON

After processing all files, write a summary to /mnt/session/outputs/batch-summary.json with:
{
  "processed_at": "<ISO timestamp>",
  "total_files": <count>,
  "results": [
    {
      "filename": "<name>",
      "document_type": "<type>",
      "extracted_data": { ... },
      "flags": ["<any issues>"]
    }
  ]
}

Also write each individual result to /mnt/session/outputs/<filename>.json.`;

  console.log("Processing documents...\n");

  // Stream-first, then send
  const stream = await client.beta.sessions.stream(session.id);

  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: processingPrompt }],
      },
    ],
  });

  for await (const event of stream) {
    if (event.type === "agent.message") {
      for (const block of event.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
        }
      }
    } else if (event.type === "session.status_idle") {
      const stopReason = (event as any).stop_reason;
      if (stopReason?.type !== "requires_action") break;
    } else if (event.type === "session.status_terminated") {
      break;
    }
  }

  // Download output files
  console.log("\n\nDownloading results...");

  // Brief delay for file indexing
  await new Promise((r) => setTimeout(r, 3000));

  const outputFiles = await client.beta.files.list({ scope: session.id });
  for (const f of outputFiles.data) {
    const safeName = basename(f.filename);
    if (!safeName || safeName === "." || safeName === "..") continue;

    const content = await client.beta.files.download(f.id);
    const buffer = Buffer.from(await content.arrayBuffer());
    const outputPath = join(outputDir, safeName);
    writeFileSync(outputPath, buffer);
    console.log(`  Saved: ${outputPath}`);
  }

  // Archive the session
  console.log("\nArchiving session...");
  await client.beta.sessions.archive(session.id);

  console.log("\n=== Batch Processing Complete ===");
  console.log(`Results written to: ${outputDir}/`);
}

main().catch((err) => {
  console.error("Batch processing error:", err.message);
  process.exit(1);
});
