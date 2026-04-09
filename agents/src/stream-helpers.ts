import type Anthropic from "@anthropic-ai/sdk";

/**
 * Stream a session to completion, handling custom tool calls.
 *
 * Opens the SSE stream, processes events, and returns when the session
 * goes idle (end_turn) or terminates. Handles custom tool calls by
 * delegating to the provided handler.
 */
export async function streamSession(
  client: Anthropic,
  sessionId: string,
  options: {
    onText?: (text: string) => void;
    onToolUse?: (event: { id: string; tool_name: string; input: unknown }) => Promise<string>;
  } = {},
): Promise<void> {
  const { onText = (t) => process.stdout.write(t), onToolUse } = options;

  while (true) {
    const stream = await client.beta.sessions.stream(sessionId);

    const pendingToolCalls: Array<{ id: string; tool_name: string; input: unknown }> = [];

    for await (const event of stream) {
      switch (event.type) {
        case "agent.message":
          for (const block of event.content) {
            if (block.type === "text") {
              onText(block.text);
            }
          }
          break;

        case "agent.custom_tool_use":
          pendingToolCalls.push({
            id: event.id,
            tool_name: (event as any).tool_name,
            input: (event as any).input,
          });
          break;

        case "session.status_idle": {
          const stopReason = (event as any).stop_reason;
          if (stopReason?.type === "requires_action") {
            // Process pending custom tool calls
            break;
          }
          // end_turn or retries_exhausted — we're done
          if (pendingToolCalls.length === 0) return;
          break;
        }

        case "session.status_terminated":
          console.log("\n--- Session terminated ---");
          return;

        case "session.error":
          console.error("\nSession error:", JSON.stringify(event, null, 2));
          break;
      }
    }

    // Handle any pending custom tool calls
    if (pendingToolCalls.length === 0) break;

    const results = [];
    for (const call of pendingToolCalls) {
      let resultText = `Tool "${call.tool_name}" not handled.`;
      if (onToolUse) {
        resultText = await onToolUse(call);
      }
      results.push({
        type: "user.custom_tool_result" as const,
        custom_tool_use_id: call.id,
        content: [{ type: "text" as const, text: resultText }],
      });
    }

    await client.beta.sessions.events.send(sessionId, { events: results });
  }
}

/**
 * Send a message to a session and stream the response.
 */
export async function sendAndStream(
  client: Anthropic,
  sessionId: string,
  message: string,
  options: Parameters<typeof streamSession>[2] = {},
): Promise<void> {
  // Stream-first: open stream before sending to catch all events
  const streamPromise = streamSession(client, sessionId, options);

  await client.beta.sessions.events.send(sessionId, {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: message }],
      },
    ],
  });

  await streamPromise;
}
