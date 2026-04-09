/**
 * Vercel API Route — Sync Agent Results to Notion
 *
 * Called by agents after processing to write results to the
 * H-4 Notion Operations Hub databases.
 *
 * Endpoints:
 *   POST /api/notion-sync?type=quote     — Add a freight quote
 *   POST /api/notion-sync?type=report    — Add a market report
 *   POST /api/notion-sync?type=document  — Add a processed document
 *
 * Setup:
 *   Add NOTION_API_KEY to Vercel env vars (Notion integration token)
 *   Add NOTION_DB_QUOTES, NOTION_DB_REPORTS, NOTION_DB_DOCUMENTS (database IDs)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const DB_IDS: Record<string, string | undefined> = {
  quote: process.env.NOTION_DB_QUOTES,
  report: process.env.NOTION_DB_REPORTS,
  document: process.env.NOTION_DB_DOCUMENTS,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const notionKey = process.env.NOTION_API_KEY;
  if (!notionKey) {
    return res.status(500).json({ error: "NOTION_API_KEY not configured" });
  }

  const type = req.query.type as string;
  const dbId = DB_IDS[type];
  if (!dbId) {
    return res.status(400).json({
      error: `Invalid type. Use: ${Object.keys(DB_IDS).join(", ")}`,
    });
  }

  try {
    const data = req.body;
    const properties = buildProperties(type, data);

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err });
    }

    const page = await response.json();
    return res.status(200).json({ success: true, page_id: page.id, url: page.url });
  } catch (err: any) {
    console.error("Notion sync error:", err.message);
    return res.status(500).json({ error: "Failed to sync to Notion" });
  }
}

function buildProperties(type: string, data: Record<string, any>) {
  switch (type) {
    case "quote":
      return {
        Quote: { title: [{ text: { content: data.cargo_type || "Freight Quote" } }] },
        Status: { select: { name: "New" } },
        "Service Category": data.service_category
          ? { select: { name: formatCategory(data.service_category) } }
          : undefined,
        Origin: data.origin ? { rich_text: [{ text: { content: data.origin } }] } : undefined,
        Destination: data.destination
          ? { rich_text: [{ text: { content: data.destination } }] }
          : undefined,
        "Cargo Type": data.cargo_type
          ? { rich_text: [{ text: { content: data.cargo_type } }] }
          : undefined,
        "Weight (lbs)": data.weight_lbs ? { number: data.weight_lbs } : undefined,
        Urgency: data.urgency
          ? { select: { name: capitalize(data.urgency) } }
          : undefined,
        Customer: data.customer
          ? { rich_text: [{ text: { content: data.customer } }] }
          : undefined,
        Email: data.email ? { email: data.email } : undefined,
        Date: { date: { start: new Date().toISOString().slice(0, 10) } },
        Notes: data.notes
          ? { rich_text: [{ text: { content: data.notes } }] }
          : undefined,
      };

    case "report":
      return {
        Report: {
          title: [{ text: { content: data.title || `Market Brief — ${new Date().toISOString().slice(0, 10)}` } }],
        },
        Status: { select: { name: "Published" } },
        Date: { date: { start: new Date().toISOString().slice(0, 10) } },
        "Key Findings": data.key_findings
          ? { rich_text: [{ text: { content: data.key_findings.slice(0, 2000) } }] }
          : undefined,
        "Hotshot Rate Avg": data.rate_avg ? { number: data.rate_avg } : undefined,
        "Diesel Price": data.diesel_price ? { number: data.diesel_price } : undefined,
        "Recommended Lanes": data.recommended_lanes
          ? { rich_text: [{ text: { content: data.recommended_lanes } }] }
          : undefined,
      };

    case "document":
      return {
        Document: {
          title: [{ text: { content: data.filename || "Processed Document" } }],
        },
        Type: data.document_type
          ? { select: { name: data.document_type } }
          : undefined,
        Status: { select: { name: "Processed" } },
        "Processed By": { select: { name: "Agent" } },
        Customer: data.customer
          ? { rich_text: [{ text: { content: data.customer } }] }
          : undefined,
        "Reference #": data.reference
          ? { rich_text: [{ text: { content: data.reference } }] }
          : undefined,
        Amount: data.amount ? { number: data.amount } : undefined,
        Date: { date: { start: new Date().toISOString().slice(0, 10) } },
        Flags: data.flags
          ? { multi_select: data.flags.map((f: string) => ({ name: f })) }
          : { multi_select: [{ name: "Clean" }] },
      };

    default:
      return {};
  }
}

function formatCategory(cat: string): string {
  const map: Record<string, string> = {
    oilfield_emergency: "Oilfield Emergency",
    construction_equipment: "Construction Equipment",
    aerospace_manufacturing: "Aerospace Manufacturing",
    equipment_rental: "Equipment Rental",
  };
  return map[cat] || cat;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
