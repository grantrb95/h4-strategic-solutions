import Anthropic from "@anthropic-ai/sdk";

// Singleton Anthropic client — reads ANTHROPIC_API_KEY from env
let _client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("Missing ANTHROPIC_API_KEY. Copy .env.example to .env and fill in your key.");
      process.exit(1);
    }
    _client = new Anthropic();
  }
  return _client;
}
