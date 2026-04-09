# H-4 Strategic Solutions — Managed Agents

AI-powered agents for H-4's freight logistics operations, built on [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview).

## Agents

| Agent | Purpose | Key Tools |
|---|---|---|
| **Quote Intake** | Parse freight requests, extract structured data, route to dispatch | Custom `submit_quote` tool |
| **Market Research** | Monitor freight rates, lane profitability, competitor analysis | Web search, web fetch |
| **Document Processing** | Parse BOLs, rate confirmations, invoices, PODs | PDF/XLSX skills, file upload |
| **Code Assistant** | Work on the H-4 website codebase | GitHub MCP, full toolset |

## Quick Start

### 1. Install dependencies

```bash
cd agents
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and add:
- `ANTHROPIC_API_KEY` — your Anthropic API key
- `GITHUB_TOKEN` — GitHub PAT with repo access (for Code Assistant)

### 3. Run one-time setup

```bash
npm run setup
```

This creates the cloud environment and all 4 agent configs. Agent IDs are saved to `.env` automatically.

### 4. Run an agent

```bash
npm run quote-intake       # Process freight quote requests
npm run market-research    # Research freight market conditions
npm run doc-processing     # Parse logistics documents
npm run code-assistant     # Work on the H-4 codebase
```

## Architecture

```
agents/
  src/
    client.ts              # Anthropic SDK client
    config.ts              # .env loader and config management
    stream-helpers.ts      # SSE stream handling utilities
    setup.ts               # ONE-TIME: creates environment + agents
    agents/
      quote-intake.ts      # Runtime: freight quote processing
      market-research.ts   # Runtime: market intelligence
      doc-processing.ts    # Runtime: document parsing
      code-assistant.ts    # Runtime: codebase changes via GitHub
```

### How It Works

1. **Setup (once):** `npm run setup` creates a cloud environment and 4 agent configs via the Anthropic API. Each agent has its own model, system prompt, tools, and skills. IDs are persisted to `.env`.

2. **Runtime (every use):** Each agent script loads its ID from `.env`, creates a session (a fresh container), and opens an SSE event stream. You chat with the agent; it uses its tools (bash, web search, file ops, custom tools) in the container. Sessions are archived when done.

### Key Concepts

- **Agent** — Persisted, versioned config (model + prompt + tools). Created once, reused across sessions.
- **Session** — A running agent instance with its own container. Created per-interaction.
- **Environment** — Sandbox config (networking, packages). Shared across agents.
- **Custom Tools** — Your app handles the tool call (e.g., `submit_quote`). The agent fires the call; your code executes it and sends the result back.

## GitHub MCP Setup (Code Assistant)

The Code Assistant uses GitHub MCP for PR creation. To enable:

1. Create a vault for MCP credentials
2. Add your GitHub OAuth token to the vault
3. Pass `vault_ids` when creating the session

See the [Managed Agents MCP docs](https://platform.claude.com/docs/en/managed-agents/mcp-connector) for details.
