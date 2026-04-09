/**
 * Vercel Serverless Function — Formspree Webhook → Quote Intake Agent
 *
 * When a customer submits the H-4 contact form, Formspree fires a webhook
 * to this endpoint. This function:
 *   1. Receives the form data
 *   2. Creates a Managed Agent session (Quote Intake)
 *   3. Sends the form data as a message
 *   4. Streams the response and captures the parsed quote
 *   5. Returns the structured quote data
 *
 * Setup:
 *   1. In Formspree dashboard → Form Settings → Webhooks
 *   2. Add webhook URL: https://your-domain.vercel.app/api/quote-webhook
 *   3. Set env vars in Vercel: ANTHROPIC_API_KEY, AGENT_ID_QUOTE_INTAKE, ENVIRONMENT_ID
 *
 * Optionally set WEBHOOK_SECRET to validate Formspree signatures.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

// Dynamic import to keep this file deployable without the SDK installed globally
async function getAnthropic() {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate webhook secret if configured
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.headers["x-formspree-signature"] !== secret) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  const agentId = process.env.AGENT_ID_QUOTE_INTAKE;
  const environmentId = process.env.ENVIRONMENT_ID;

  if (!agentId || !environmentId) {
    console.error("Missing AGENT_ID_QUOTE_INTAKE or ENVIRONMENT_ID");
    return res.status(500).json({ error: "Agent not configured" });
  }

  try {
    const client = await getAnthropic();

    // Extract form data from Formspree webhook payload
    const formData = req.body;
    const customerMessage = formatFormData(formData);

    // Create a session for this quote
    const session = await client.beta.sessions.create({
      agent: agentId,
      environment_id: environmentId,
      title: `Quote — ${formData.name || "Unknown"} — ${new Date().toISOString().slice(0, 10)}`,
    });

    // Send the form data to the agent
    await client.beta.sessions.events.send(session.id, {
      events: [
        {
          type: "user.message",
          content: [
            {
              type: "text",
              text: `New freight quote request from the H-4 website:\n\n${customerMessage}\n\nParse this request, extract all freight details, classify the service category, and submit the quote.`,
            },
          ],
        },
      ],
    });

    // Stream and collect the response
    let agentResponse = "";
    let quoteData: unknown = null;

    const stream = await client.beta.sessions.stream(session.id);

    for await (const event of stream) {
      if (event.type === "agent.message") {
        for (const block of event.content) {
          if (block.type === "text") {
            agentResponse += block.text;
          }
        }
      } else if (event.type === "agent.custom_tool_use") {
        // Capture the structured quote from submit_quote
        quoteData = (event as any).input;

        // Auto-accept the quote submission
        await client.beta.sessions.events.send(session.id, {
          events: [
            {
              type: "user.custom_tool_result",
              custom_tool_use_id: event.id,
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    status: "received",
                    quote_id: `H4-${Date.now()}`,
                    message: "Quote submitted via webhook.",
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

    // Archive the session
    await client.beta.sessions.archive(session.id);

    return res.status(200).json({
      success: true,
      session_id: session.id,
      quote: quoteData,
      agent_response: agentResponse.slice(0, 500),
    });
  } catch (err: any) {
    console.error("Quote webhook error:", err.message);
    return res.status(500).json({ error: "Failed to process quote" });
  }
}

/** Format Formspree form data into a human-readable message */
function formatFormData(data: Record<string, unknown>): string {
  const lines: string[] = [];

  // Map known H-4 form fields
  if (data.name) lines.push(`Name: ${data.name}`);
  if (data.company) lines.push(`Company: ${data.company}`);
  if (data.email) lines.push(`Email: ${data.email}`);
  if (data.message || data.msg) lines.push(`Details: ${data.message || data.msg}`);

  // Include any extra fields
  for (const [key, value] of Object.entries(data)) {
    if (!["name", "company", "email", "message", "msg", "_replyto", "_subject"].includes(key)) {
      lines.push(`${key}: ${value}`);
    }
  }

  return lines.join("\n");
}
