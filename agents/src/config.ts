import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "../.env");

interface AgentConfig {
  ENVIRONMENT_ID: string;
  AGENT_ID_QUOTE_INTAKE: string;
  AGENT_ID_MARKET_RESEARCH: string;
  AGENT_ID_DOC_PROCESSING: string;
  AGENT_ID_CODE_ASSISTANT: string;
}

/** Load .env file into process.env (minimal loader, no external deps) */
export function loadEnv(): void {
  if (!existsSync(ENV_PATH)) {
    console.error("No .env file found. Copy .env.example to .env and configure it.");
    process.exit(1);
  }
  const lines = readFileSync(ENV_PATH, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

/** Read agent/environment IDs from .env */
export function getConfig(): Partial<AgentConfig> {
  loadEnv();
  return {
    ENVIRONMENT_ID: process.env.ENVIRONMENT_ID,
    AGENT_ID_QUOTE_INTAKE: process.env.AGENT_ID_QUOTE_INTAKE,
    AGENT_ID_MARKET_RESEARCH: process.env.AGENT_ID_MARKET_RESEARCH,
    AGENT_ID_DOC_PROCESSING: process.env.AGENT_ID_DOC_PROCESSING,
    AGENT_ID_CODE_ASSISTANT: process.env.AGENT_ID_CODE_ASSISTANT,
  };
}

/** Require a specific config value or exit with a helpful message */
export function requireConfig(key: keyof AgentConfig): string {
  const config = getConfig();
  const value = config[key];
  if (!value) {
    console.error(`Missing ${key} in .env. Run 'npm run setup' first to create agents.`);
    process.exit(1);
  }
  return value;
}

/** Save a key=value back to the .env file */
export function saveToEnv(key: string, value: string): void {
  if (!existsSync(ENV_PATH)) {
    writeFileSync(ENV_PATH, `${key}=${value}\n`);
    return;
  }
  let content = readFileSync(ENV_PATH, "utf-8");
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }
  writeFileSync(ENV_PATH, content);
}
