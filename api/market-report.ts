/**
 * Vercel Cron Function — Daily Market Research Report
 *
 * Runs the Market Research agent on a schedule to generate
 * freight market intelligence reports for H-4 dispatch.
 *
 * Setup:
 *   1. Add to vercel.json crons config (see below)
 *   2. Set env vars: ANTHROPIC_API_KEY, AGENT_ID_MARKET_RESEARCH, ENVIRONMENT_ID
 *   3. Optionally set SLACK_WEBHOOK_URL to post reports to Slack
 *
 * vercel.json:
 *   { "crons": [{ "path": "/api/market-report", "schedule": "0 7 * * 1-5" }] }
 *   (Runs Mon-Fri at 7 AM UTC)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

async function getAnthropic() {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic();
}

const RESEARCH_PROMPT = `Generate today's H-4 Strategic Solutions market intelligence brief.

Research and report on:

1. **Hotshot Freight Rates** — Current spot rates for flatbed/hotshot in key corridors:
   - Oklahoma → Texas (Permian Basin)
   - Oklahoma → North Dakota (Bakken)
   - Oklahoma → Gulf Coast refineries
   - Cross-country expedited rates

2. **Oil & Gas Activity** — Rig counts, drilling activity, any production news affecting freight demand

3. **Fuel Prices** — Current diesel prices, trend direction, impact on margins

4. **Industry News** — Any regulatory changes, capacity shifts, or major events in hotshot/expedited freight

5. **Recommendations** — Actionable items for H-4 dispatch:
   - Lanes to target this week
   - Rates to hold firm on vs. negotiate
   - Capacity positioning suggestions

Format as a clean, scannable brief. Include sources and dates. Be specific with numbers.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron invocation or authorized request
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const agentId = process.env.AGENT_ID_MARKET_RESEARCH;
  const environmentId = process.env.ENVIRONMENT_ID;

  if (!agentId || !environmentId) {
    console.error("Missing AGENT_ID_MARKET_RESEARCH or ENVIRONMENT_ID");
    return res.status(500).json({ error: "Agent not configured" });
  }

  try {
    const client = await getAnthropic();

    // Create a session for today's report
    const today = new Date().toISOString().slice(0, 10);
    const session = await client.beta.sessions.create({
      agent: agentId,
      environment_id: environmentId,
      title: `Market Brief — ${today}`,
    });

    // Send the research prompt
    await client.beta.sessions.events.send(session.id, {
      events: [
        {
          type: "user.message",
          content: [{ type: "text", text: RESEARCH_PROMPT }],
        },
      ],
    });

    // Stream and collect the full report
    let report = "";
    const stream = await client.beta.sessions.stream(session.id);

    for await (const event of stream) {
      if (event.type === "agent.message") {
        for (const block of event.content) {
          if (block.type === "text") {
            report += block.text;
          }
        }
      } else if (event.type === "session.status_idle") {
        const stopReason = (event as any).stop_reason;
        if (stopReason?.type !== "requires_action") break;
      } else if (event.type === "session.status_terminated") {
        break;
      }
    }

    // Archive the session
    await client.beta.sessions.archive(session.id);

    // Post to Slack if configured
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook && report) {
      await fetch(slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*H-4 Market Intelligence Brief — ${today}*\n\n${report.slice(0, 3000)}`,
        }),
      });
    }

    return res.status(200).json({
      success: true,
      date: today,
      session_id: session.id,
      report_length: report.length,
      report: report.slice(0, 5000),
    });
  } catch (err: any) {
    console.error("Market report error:", err.message);
    return res.status(500).json({ error: "Failed to generate report" });
  }
}
