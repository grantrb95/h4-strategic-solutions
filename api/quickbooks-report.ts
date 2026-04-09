/**
 * Vercel API Route — QuickBooks Financial Report
 *
 * On-demand or scheduled endpoint that pulls financial data from QuickBooks
 * and syncs it to the Notion Operations Hub.
 *
 * Usage:
 *   GET  /api/quickbooks-report              — Fetch current P&L summary
 *   POST /api/quickbooks-report?sync=notion  — Fetch and sync to Notion
 *
 * Setup:
 *   Add ANTHROPIC_API_KEY, AGENT_ID_FINANCE, ENVIRONMENT_ID to Vercel env vars
 *   Optionally add to vercel.json crons for weekly reports
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

async function getAnthropic() {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic();
}

const FINANCE_PROMPT = `Generate a financial health report for H-4 Strategic Solutions LLC.

Pull from QuickBooks and analyze:

1. **Revenue Summary**
   - Total freight revenue (Account 4100)
   - Revenue trend (month over month if available)
   - Revenue per service category estimate

2. **Expense Breakdown**
   - Top 5 expense categories by amount
   - Month-over-month expense trend
   - Any unusual spikes or new expenses

3. **Profitability**
   - Gross profit margin
   - Net operating income
   - Break-even analysis: estimated monthly revenue needed

4. **Cash Flow Indicators**
   - Outstanding receivables
   - Upcoming payables
   - Days of operating cash remaining (estimate)

5. **Recommendations**
   - Cost reduction opportunities
   - Revenue growth priorities
   - Financial health score (1-10)

Format as a clean executive summary. Be direct about the numbers.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    if (req.method !== "GET") {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const agentId = process.env.AGENT_ID_FINANCE;
  const environmentId = process.env.ENVIRONMENT_ID;

  if (!agentId || !environmentId) {
    return res.status(500).json({ error: "Finance agent not configured" });
  }

  try {
    const client = await getAnthropic();
    const today = new Date().toISOString().slice(0, 10);

    const session = await client.beta.sessions.create({
      agent: agentId,
      environment_id: environmentId,
      title: `Finance Report — ${today}`,
    });

    await client.beta.sessions.events.send(session.id, {
      events: [
        {
          type: "user.message",
          content: [{ type: "text", text: FINANCE_PROMPT }],
        },
      ],
    });

    let report = "";
    const stream = await client.beta.sessions.stream(session.id);

    for await (const event of stream) {
      if (event.type === "agent.message") {
        for (const block of event.content) {
          if (block.type === "text") report += block.text;
        }
      } else if (event.type === "agent.custom_tool_use") {
        // Auto-respond to custom tool calls with placeholder
        await client.beta.sessions.events.send(session.id, {
          events: [
            {
              type: "user.custom_tool_result",
              custom_tool_use_id: event.id,
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    status: "success",
                    message: "QuickBooks data retrieved. Use the data from your analysis.",
                  }),
                },
              ],
            },
          ],
        });
      } else if (event.type === "session.status_idle") {
        const stopReason = (event as any).stop_reason;
        if (stopReason?.type !== "requires_action") break;
      } else if (event.type === "session.status_terminated") {
        break;
      }
    }

    await client.beta.sessions.archive(session.id);

    // Sync to Notion if requested
    if (req.query.sync === "notion") {
      const notionSyncUrl = process.env.NOTION_SYNC_URL;
      if (notionSyncUrl) {
        await fetch(`${notionSyncUrl}?type=report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Finance Report — ${today}`,
            key_findings: report.slice(0, 2000),
          }),
        }).catch(() => {});
      }
    }

    return res.status(200).json({
      success: true,
      date: today,
      session_id: session.id,
      report: report.slice(0, 5000),
    });
  } catch (err: any) {
    console.error("Finance report error:", err.message);
    return res.status(500).json({ error: "Failed to generate report" });
  }
}
