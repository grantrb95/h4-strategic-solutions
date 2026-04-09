/**
 * ONE-TIME SETUP — Run once, save the IDs to .env
 *
 * Creates:
 *   1. A cloud environment (sandbox for agent containers)
 *   2. Four agent configs for H-4 Strategic Solutions:
 *      - Quote Intake Agent
 *      - Market Research Agent
 *      - Document Processing Agent
 *      - Code Assistant Agent
 *
 * Usage: npm run setup
 */

import { getClient } from "./client.js";
import { loadEnv, saveToEnv } from "./config.js";

loadEnv();
const client = getClient();

async function main() {
  console.log("=== H-4 Strategic Solutions — Managed Agents Setup ===\n");

  // ─── 1. Create Environment ───────────────────────────────────────
  console.log("1. Creating cloud environment...");
  const environment = await client.beta.environments.create({
    name: "h4-production",
    config: {
      type: "cloud",
      networking: { type: "unrestricted" },
    },
  });
  saveToEnv("ENVIRONMENT_ID", environment.id);
  console.log(`   Environment created: ${environment.id}\n`);

  // ─── 2. Create Quote Intake Agent ────────────────────────────────
  console.log("2. Creating Quote Intake Agent...");
  const quoteAgent = await client.beta.agents.create({
    name: "H-4 Quote Intake",
    description: "Processes incoming freight quote requests for H-4 Strategic Solutions",
    model: "claude-opus-4-6",
    system: `You are the Quote Intake Agent for H-4 Strategic Solutions, a premium hotshot freight carrier based in Fort Gibson, Oklahoma.

Your job:
1. Parse incoming freight quote requests (email text, form submissions, voice transcriptions)
2. Extract structured data: origin, destination, cargo type, weight, dimensions, urgency level, special requirements
3. Classify the request into H-4's service categories:
   - Oilfield Emergency (highest priority)
   - Construction Equipment
   - Aerospace Manufacturing
   - Equipment Rental Logistics
4. Estimate if the route falls within H-4's 48-state coverage
5. Flag any special handling requirements (hazmat, oversize, time-critical)
6. Output a structured JSON quote summary and call the submit_quote tool

Be professional, thorough, and always confirm ambiguous details. H-4's motto: "We don't move loads. We deliver outcomes."`,
    tools: [
      { type: "agent_toolset_20260401", default_config: { enabled: true } },
      {
        type: "custom",
        name: "submit_quote",
        description: "Submit a parsed freight quote to the H-4 dispatch system",
        input_schema: {
          type: "object",
          properties: {
            origin: { type: "string", description: "Pickup city and state" },
            destination: { type: "string", description: "Delivery city and state" },
            cargo_type: { type: "string", description: "Type of cargo" },
            weight_lbs: { type: "number", description: "Estimated weight in pounds" },
            service_category: {
              type: "string",
              enum: ["oilfield_emergency", "construction_equipment", "aerospace_manufacturing", "equipment_rental"],
              description: "H-4 service category",
            },
            urgency: {
              type: "string",
              enum: ["standard", "expedited", "emergency"],
              description: "Urgency level",
            },
            special_requirements: {
              type: "array",
              items: { type: "string" },
              description: "Special handling requirements (hazmat, oversize, etc.)",
            },
            notes: { type: "string", description: "Additional notes" },
          },
          required: ["origin", "destination", "cargo_type", "service_category", "urgency"],
        },
      },
    ],
  });
  saveToEnv("AGENT_ID_QUOTE_INTAKE", quoteAgent.id);
  console.log(`   Quote Intake Agent created: ${quoteAgent.id}\n`);

  // ─── 3. Create Market Research Agent ─────────────────────────────
  console.log("3. Creating Market Research Agent...");
  const marketAgent = await client.beta.agents.create({
    name: "H-4 Market Research",
    description: "Monitors freight market conditions and lane profitability for H-4",
    model: "claude-opus-4-6",
    system: `You are the Market Research Agent for H-4 Strategic Solutions, a premium hotshot freight carrier.

Your job:
1. Research current freight market conditions using web search
2. Analyze lane profitability for H-4's key corridors (Oklahoma hub to nationwide)
3. Track competitor pricing and service offerings in the hotshot freight segment
4. Monitor fuel prices, regulatory changes, and industry trends
5. Generate actionable reports with recommendations

Focus areas:
- Hotshot/expedited freight rates per mile by region
- Oil & gas sector activity (H-4's primary market)
- Construction and aerospace logistics demand
- DAT, Truckstop, and industry rate benchmarks
- Seasonal patterns and capacity trends

Output clear, data-backed reports. Include sources and dates for all market data.`,
    tools: [
      { type: "agent_toolset_20260401", default_config: { enabled: true } },
    ],
  });
  saveToEnv("AGENT_ID_MARKET_RESEARCH", marketAgent.id);
  console.log(`   Market Research Agent created: ${marketAgent.id}\n`);

  // ─── 4. Create Document Processing Agent ─────────────────────────
  console.log("4. Creating Document Processing Agent...");
  const docAgent = await client.beta.agents.create({
    name: "H-4 Document Processor",
    description: "Parses and processes freight documents (BOLs, rate confirmations, invoices)",
    model: "claude-opus-4-6",
    system: `You are the Document Processing Agent for H-4 Strategic Solutions, a premium hotshot freight carrier.

Your job:
1. Parse freight logistics documents: Bills of Lading (BOLs), rate confirmations, invoices, PODs
2. Extract structured data from each document type
3. Cross-reference document data for consistency (e.g., BOL weight vs invoice weight)
4. Flag discrepancies, missing fields, or compliance issues
5. Output clean, structured JSON for each processed document

Document types you handle:
- Bill of Lading (BOL): shipper, consignee, carrier, commodity, weight, pieces, special instructions
- Rate Confirmation: lane, rate, fuel surcharge, accessorials, payment terms
- Invoice: charges breakdown, reference numbers, due dates
- Proof of Delivery (POD): delivery time, receiver signature status, condition notes

Be meticulous. In freight, a missed detail costs money.`,
    tools: [
      { type: "agent_toolset_20260401", default_config: { enabled: true } },
    ],
    skills: [
      { type: "anthropic", skill_id: "pdf" },
      { type: "anthropic", skill_id: "xlsx" },
    ],
  });
  saveToEnv("AGENT_ID_DOC_PROCESSING", docAgent.id);
  console.log(`   Document Processing Agent created: ${docAgent.id}\n`);

  // ─── 5. Create Code Assistant Agent ──────────────────────────────
  console.log("5. Creating Code Assistant Agent...");
  const codeAgent = await client.beta.agents.create({
    name: "H-4 Code Assistant",
    description: "Works on the H-4 Strategic Solutions website codebase",
    model: "claude-opus-4-6",
    system: `You are the Code Assistant for H-4 Strategic Solutions.

The codebase is a premium marketing website for a hotshot freight carrier:
- Static HTML site (index.html) with vanilla JS and modern CSS
- Dark terminal-grade aesthetic (#050507 background, #e8501e orange accent)
- Fonts: Bebas Neue (headlines), Plus Jakarta Sans (body), JetBrains Mono (code)
- Deployed on Vercel
- Contact form via Formspree
- Google Analytics (GTM) integration

Your job:
1. Implement new features and sections
2. Fix bugs and improve performance
3. Maintain the design system consistency
4. Ensure mobile responsiveness
5. Follow best practices for accessibility and SEO

When making changes:
- Preserve the existing design language
- Test responsiveness across breakpoints
- Keep the site performant (no heavy frameworks)
- Commit with clear, descriptive messages
- Create feature branches when appropriate`,
    mcp_servers: [
      {
        type: "url",
        name: "github",
        url: "https://api.githubcopilot.com/mcp/",
      },
    ],
    tools: [
      { type: "agent_toolset_20260401", default_config: { enabled: true } },
      { type: "mcp_toolset", mcp_server_name: "github" },
    ],
  });
  saveToEnv("AGENT_ID_CODE_ASSISTANT", codeAgent.id);
  console.log(`   Code Assistant Agent created: ${codeAgent.id}\n`);

  // ─── 6. Create Finance Agent ────────────────────────────────────
  console.log("6. Creating Finance Agent...");
  const financeAgent = await client.beta.agents.create({
    name: "H-4 Finance",
    description: "Financial analysis and QuickBooks integration for H-4",
    model: "claude-opus-4-6",
    system: `You are the Finance Agent for H-4 Strategic Solutions LLC, a premium hotshot freight carrier (NAICS 484121).

Your job:
1. Analyze financial data from QuickBooks (P&L, cash flow, expenses)
2. Track revenue by lane and service category
3. Monitor expense categories: fuel, insurance, maintenance, equipment, permits
4. Generate financial reports and profitability analysis
5. Flag concerning trends (rising costs, declining margins, overdue invoices)
6. Provide actionable recommendations for financial health

H-4 QuickBooks accounts:
- 4100 Freight Revenue (primary income)
- Expense categories: fuel, insurance, maintenance, driver comp, equipment leases, operating supplies, permits

When asked for data, use the get_quickbooks_data tool. When asked to save/sync results, use sync_to_notion.
Format financial data clearly with dollar amounts and percentages.`,
    tools: [
      { type: "agent_toolset_20260401", default_config: { enabled: true } },
      {
        type: "custom",
        name: "get_quickbooks_data",
        description: "Fetch financial data from QuickBooks (P&L, cash flow, balance sheet)",
        input_schema: {
          type: "object",
          properties: {
            report_type: {
              type: "string",
              enum: ["profit_loss", "cash_flow", "balance_sheet", "expenses", "invoices"],
              description: "Type of financial report to pull",
            },
            period_start: { type: "string", description: "Start date (YYYY-MM-DD)" },
            period_end: { type: "string", description: "End date (YYYY-MM-DD)" },
          },
          required: ["report_type"],
        },
      },
      {
        type: "custom",
        name: "sync_to_notion",
        description: "Sync financial data to the H-4 Notion Operations Hub",
        input_schema: {
          type: "object",
          properties: {
            data_type: { type: "string", description: "Type of data to sync" },
            content: { type: "string", description: "JSON content to sync" },
          },
          required: ["data_type", "content"],
        },
      },
    ],
  });
  saveToEnv("AGENT_ID_FINANCE", financeAgent.id);
  console.log(`   Finance Agent created: ${financeAgent.id}\n`);

  // ─── Done ────────────────────────────────────────────────────────
  console.log("=== Setup Complete ===");
  console.log("\nAll IDs saved to .env. You can now run any agent:");
  console.log("  npm run quote-intake");
  console.log("  npm run market-research");
  console.log("  npm run doc-processing");
  console.log("  npm run code-assistant");
  console.log("  npm run finance");
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
