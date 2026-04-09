# H-4 Strategic Solutions — Complete Setup & Usage Guide

Everything you need to get the AI-powered operations system running for H-4.

---

## What Is This?

This system uses **Claude Managed Agents** — AI agents hosted by Anthropic that run in their own sandboxed containers. Each agent has specific tools, a system prompt, and a job. They can search the web, read/write files, execute code, and connect to services like GitHub.

You have **5 agents**, each doing a different job for H-4:

| Agent | Job | How It Runs |
|---|---|---|
| **Quote Intake** | Parses freight requests from customers into structured data | Automatically (webhook) or manually (CLI) |
| **Market Research** | Searches the web for freight rates, trends, competitor intel | Automatically (daily cron) or manually (CLI) |
| **Document Processing** | Reads BOLs, invoices, rate confirmations, extracts data | Manually (CLI or batch) |
| **Code Assistant** | Edits the H-4 website, creates PRs on GitHub | Manually (CLI) |
| **Finance** | Pulls P&L, expenses, cash flow from QuickBooks | Automatically (weekly cron) or manually (CLI) |

All results flow into your **Notion Operations Hub** — a set of databases that act as your single source of truth.

---

## What You Need Before Starting

- [ ] **Anthropic API Key** — Get one at https://console.anthropic.com
- [ ] **Node.js 18+** installed — Check with `node --version`
- [ ] **GitHub Personal Access Token** — For the Code Assistant agent
- [ ] **Notion Integration Token** (optional) — For auto-syncing to Notion
- [ ] **Slack Incoming Webhook URL** (optional) — For posting reports to #h-4-hq

---

## Step-by-Step Setup

### Step 1: Install Dependencies

Open your terminal and run:

```bash
cd h4-strategic-solutions/agents
npm install
```

This installs the Anthropic SDK and TypeScript tools. Takes about 30 seconds.

### Step 2: Create Your .env File

```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in your API key:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

That's the only required value. Everything else gets auto-populated in the next step.

### Step 3: Create Your Agents (One-Time Setup)

```bash
npm run setup
```

This script does the following:
1. Creates a **cloud environment** (the sandbox where agents run)
2. Creates **5 agent configurations** (Quote Intake, Market Research, Doc Processing, Code Assistant, Finance)
3. Saves all IDs to your `.env` file automatically

You'll see output like:
```
=== H-4 Strategic Solutions — Managed Agents Setup ===

1. Creating cloud environment...
   Environment created: env_abc123

2. Creating Quote Intake Agent...
   Quote Intake Agent created: agent_def456

... (and so on for all 5 agents)

=== Setup Complete ===
```

**You only run this once.** The agent IDs are saved and reused for every future session.

### Step 4: Test It

Run any agent to make sure it works:

```bash
npm run quote-intake
```

You'll see:
```
=== H-4 Quote Intake Agent ===
Paste a freight request, email, or form submission.

Session: sess_abc123

[You] 
```

Try pasting something like:
```
Need to move a 15,000 lb compressor from Tulsa, OK to Midland, TX. 
Emergency - well site needs it by tomorrow morning. 
Contact: John at ABC Drilling, john@abcdrilling.com
```

The agent will parse it, classify it (Oilfield Emergency), extract all the details, and submit a structured quote. Type `exit` to end.

---

## Using Each Agent

### Quote Intake Agent

**What it does:** Takes raw freight requests (emails, form submissions, phone notes) and turns them into structured data with origin, destination, weight, urgency, service category.

**Run it:**
```bash
npm run quote-intake
```

**Try these inputs:**
- Paste a customer email requesting a haul
- Type: "Need flatbed from OKC to Houston, 8000 lbs of pipe, next week"
- Paste a form submission with name, company, and freight details

**Custom tool — `submit_quote`:** When the agent has enough info, it calls `submit_quote` with structured JSON. In the CLI, this prints the data. In production (the webhook), it syncs to Notion.

---

### Market Research Agent

**What it does:** Searches the web for current freight rates, diesel prices, industry news, and competitor intel relevant to H-4's hotshot operations.

**Run it:**
```bash
npm run market-research
```

**Try these prompts:**
- "What are current hotshot freight rates from Oklahoma to the Permian Basin?"
- "What's the latest on oil rig counts and how does it affect freight demand?"
- "Compare diesel prices this week vs last month"
- "What are my competitors charging for expedited flatbed in the Southwest?"

**Automated:** This also runs daily via Vercel cron (see Vercel Setup below).

---

### Document Processing Agent

**What it does:** Reads freight documents (BOLs, rate confirmations, invoices, PODs) and extracts structured data. Flags discrepancies.

**Run it (interactive):**
```bash
npm run doc-processing
```

**Commands inside the session:**
- `/upload ./path/to/document.pdf` — Upload a file for processing
- `/list` — See output files from the session
- Just paste text and ask it to parse

**Run it (batch mode):**
```bash
npm run doc-batch ./path/to/documents/
```

This scans the folder for PDFs, Excel files, and CSVs, uploads them all, and tells the agent to process everything. Results are saved to `./doc-results/`.

---

### Code Assistant Agent

**What it does:** Works on the H-4 website codebase. Can read files, edit code, run commands, and create GitHub PRs (with vault setup).

**Run it:**
```bash
npm run code-assistant
```

**Requires:** `GITHUB_TOKEN` in your `.env` (a GitHub PAT with Contents: Read and write).

**Try these prompts:**
- "Add a testimonials section below the services section"
- "The mobile menu isn't closing after clicking a link, fix it"
- "Improve the lighthouse performance score"
- "Add structured data markup for local business SEO"

The agent has the full H-4 repo mounted at `/workspace/h4-strategic-solutions` and can read, edit, and commit files.

**For PR creation:** Run `npm run setup-vault` after adding GitHub OAuth credentials to `.env`. This creates a vault that lets the agent use GitHub's MCP server to open PRs.

---

### Finance Agent

**What it does:** Analyzes financial data from QuickBooks — P&L reports, expense breakdowns, cash flow, profitability analysis.

**Run it:**
```bash
npm run finance
```

**Try these prompts:**
- "What's our current P&L?"
- "Break down our top 5 expense categories"
- "What's our monthly burn rate?"
- "How much revenue do we need to break even?"

---

## Vercel Setup (Automated Pipelines)

This is what makes everything run hands-free.

### Step 1: Merge the PR

Go to https://github.com/grantrb95/h4-strategic-solutions/pulls and merge the open PR to `main`. Vercel auto-deploys.

### Step 2: Add Environment Variables in Vercel

Go to your Vercel dashboard → `h4-strategic-solutions` → Settings → Environment Variables.

**Required:**
```
ANTHROPIC_API_KEY          = sk-ant-your-key
ENVIRONMENT_ID             = env_xxx (from agents/.env)
AGENT_ID_QUOTE_INTAKE      = agent_xxx (from agents/.env)
AGENT_ID_MARKET_RESEARCH   = agent_xxx (from agents/.env)
AGENT_ID_FINANCE           = agent_xxx (from agents/.env)
```

**For Slack notifications (optional):**
```
SLACK_WEBHOOK_URL          = https://hooks.slack.com/services/xxx
```

**For Notion sync (optional):**
```
NOTION_API_KEY             = secret_xxx (Notion integration token)
NOTION_DB_QUOTES           = database-id-from-notion
NOTION_DB_REPORTS          = database-id-from-notion
NOTION_DB_DOCUMENTS        = database-id-from-notion
NOTION_SYNC_URL            = https://your-domain.vercel.app/api/notion-sync
```

**For security (optional but recommended):**
```
CRON_SECRET                = any-random-string
WEBHOOK_SECRET             = from-formspree-dashboard
```

### Step 3: Connect Formspree Webhook

1. Go to https://formspree.io → your H-4 form
2. Settings → Webhooks
3. Add: `https://your-domain.vercel.app/api/quote-webhook`
4. Save

Now every form submission auto-triggers the Quote Intake Agent.

### Step 4: Verify Crons

Go to Vercel dashboard → Crons tab. You should see:
- `/api/market-report` — Mon-Fri at 7:00 AM UTC
- `/api/quickbooks-report?sync=notion` — Monday at 8:00 AM UTC

---

## What Happens Automatically After Setup

| When | What Happens | Where Results Go |
|---|---|---|
| **Customer fills form** | Quote Intake Agent parses the request | Notion "Freight Quotes" DB |
| **Mon-Fri 7 AM UTC** | Market Research Agent searches the web | Slack #h-4-hq + Notion "Market Reports" DB |
| **Monday 8 AM UTC** | Finance Agent pulls QuickBooks data | Notion "Market Reports" DB |

---

## Notion Operations Hub

Open Notion and look for **"H-4 Strategic Solutions — Operations Hub"**. Inside:

### Freight Quotes Database
Every quote — manual or automatic — lands here.
- **Status:** New → Quoted → Accepted → In Transit → Delivered
- **Service Category:** Oilfield Emergency, Construction, Aerospace, Equipment Rental
- **Urgency:** Standard / Expedited / Emergency
- **Fields:** Origin, Destination, Cargo Type, Weight, Rate, Customer, Email

### Market Intelligence Reports Database
Daily market briefs from the Research Agent.
- **Hotshot Rate Avg:** Average rate per mile
- **Diesel Price:** Current diesel
- **Key Findings:** Summary of the brief
- **Recommended Lanes:** Where to focus

### Documents Database
Processed freight documents.
- **Type:** BOL, Rate Confirmation, Invoice, POD
- **Flags:** Missing Fields, Weight Discrepancy, Rate Mismatch, Compliance Issue, Clean
- **Processed By:** Agent or Manual

### Financial Overview
Snapshot from QuickBooks. Updated weekly by the Finance Agent.

---

## How Managed Agents Work (Under the Hood)

### The Architecture

```
You (or a webhook/cron) 
    → Create a Session (references an Agent + Environment)
    → Send a message
    → Agent runs in a sandboxed container
    → Agent uses tools (bash, web search, file ops, custom tools)
    → Agent streams events back (text, tool calls, status)
    → Session goes idle or terminated
    → You read the results
```

### Key Concepts

**Agent** — A saved configuration: model (Claude Opus 4.6), system prompt, and tools. Created once, stored by Anthropic, referenced by ID. Like a job description.

**Session** — A running instance of an agent. Gets its own container (sandbox). Like a shift — the agent clocks in, does the work, clocks out.

**Environment** — The sandbox config (networking, packages). Shared across agents. Like the office building.

**Tools** — What the agent can do:
- `agent_toolset_20260401`: Built-in tools — bash, read, write, edit, glob, grep, web_search, web_fetch
- `custom`: Your app handles the call (e.g., `submit_quote`)
- `mcp_toolset`: Third-party integrations via MCP (GitHub, etc.)

**Events** — The communication channel:
- You send: `user.message`, `user.custom_tool_result`
- Agent sends: `agent.message`, `agent.tool_use`, `agent.custom_tool_use`
- Status: `session.status_idle`, `session.status_terminated`

### The Setup-Once, Run-Many Pattern

```
Setup (one time):
  agents.create() → agent_id  (saved to .env)
  environments.create() → env_id  (saved to .env)

Every run:
  sessions.create(agent=agent_id, environment=env_id) → session
  sessions.events.send(session, message)
  sessions.stream(session) → process events
  sessions.archive(session)
```

This is why `npm run setup` only runs once. The agents persist on Anthropic's servers.

---

## File Structure

```
h4-strategic-solutions/
├── index.html                     # H-4 marketing website
├── vercel.json                    # Cron schedules
├── SETUP-GUIDE.md                 # This file
│
├── api/                           # Vercel serverless functions
│   ├── quote-webhook.ts           # Formspree → Quote Agent → Notion
│   ├── market-report.ts           # Cron → Research Agent → Slack + Notion
│   ├── quickbooks-report.ts       # Cron → Finance Agent → Notion
│   └── notion-sync.ts             # Universal Notion DB writer
│
└── agents/                        # Managed Agents SDK project
    ├── package.json
    ├── tsconfig.json
    ├── .env.example               # Copy to .env, fill in keys
    ├── .gitignore                 # Keeps .env out of git
    ├── README.md                  # Quick reference
    │
    └── src/
        ├── client.ts              # Anthropic SDK client
        ├── config.ts              # .env loader
        ├── stream-helpers.ts      # SSE streaming + custom tool handling
        ├── setup.ts               # ONE-TIME: create environment + 5 agents
        ├── setup-vault.ts         # ONE-TIME: GitHub MCP OAuth vault
        │
        └── agents/
            ├── quote-intake.ts    # Interactive quote processing
            ├── market-research.ts # Interactive market research
            ├── doc-processing.ts  # Interactive document parsing
            ├── doc-batch.ts       # Batch: process folder of docs
            ├── code-assistant.ts  # GitHub repo editing + PRs
            └── finance.ts         # QuickBooks financial analysis
```

---

## Troubleshooting

**"Missing ANTHROPIC_API_KEY"**
→ Make sure `.env` exists in the `agents/` folder and has your key.

**"Missing AGENT_ID_xxx"**
→ Run `npm run setup` first. It creates agents and saves IDs to `.env`.

**Agent seems stuck**
→ Type `exit` to end the session. Each session is independent.

**Vercel crons not running**
→ Check the Crons tab in Vercel dashboard. Crons require a Pro plan on Vercel.

**Notion sync not working**
→ Verify `NOTION_API_KEY` and database IDs are correct in Vercel env vars. The Notion integration must have access to the Operations Hub page.

**Quote webhook not firing**
→ Check Formspree webhook settings. Test with: `curl -X POST https://your-domain.vercel.app/api/quote-webhook -H 'Content-Type: application/json' -d '{"name":"Test","email":"test@test.com","msg":"Need flatbed from OKC to Dallas"}'`

---

## Quick Reference Card

```
SETUP (once):
  cd agents && npm install && cp .env.example .env
  # Add ANTHROPIC_API_KEY to .env
  npm run setup

DAILY USE:
  npm run quote-intake        # Process a freight request
  npm run market-research     # Research freight market
  npm run doc-processing      # Parse a document
  npm run doc-batch ./docs/   # Batch process documents
  npm run finance             # Financial analysis
  npm run code-assistant      # Edit the website

AUTOMATED (after Vercel deploy):
  Formspree form → Quote Agent → Notion
  Mon-Fri 7AM → Market Agent → Slack + Notion
  Monday 8AM → Finance Agent → Notion
```
