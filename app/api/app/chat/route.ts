import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { insertBehaviorEvents } from "@/lib/behaviorEventStore";
import { getAppConfigByDeviceCode } from "@/lib/appDeviceService";
import { runChatRouter } from "@/lib/chatRouterService";

export const runtime = "nodejs";

const schema = z.object({
  deviceCode: z.string().min(1),
  query: z.string().min(1),
  traceId: z.string().optional(),
  conversationId: z.string().optional(),
  turnId: z.string().optional(),
  stream: z.boolean().optional(),
  mode: z.enum(["fixed_qa", "knowledge", "auto"]).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
});

export async function POST(request: Request) {
  try {
    const receivedAt = Date.now();
    const input = schema.parse(await request.json());
    const config = getAppConfigByDeviceCode(input.deviceCode);
    insertBehaviorEvents([{
      id: `${input.traceId || "no-trace"}:server_chat_received:${receivedAt}`,
      sessionId: input.traceId || input.deviceCode,
      conversationId: input.conversationId,
      turnId: input.turnId,
      traceId: input.traceId,
      deviceCode: input.deviceCode,
      digitalHumanId: config.digitalHumanId,
      source: "server",
      category: "llm",
      eventName: "server_chat_received",
      timestampMs: receivedAt,
      payload: {
        mode: input.mode || "auto",
        queryLength: input.query.trim().length,
        historyCount: input.history?.length || 0,
      },
    }]);

    const result = await runChatRouter({
      deviceCode: input.deviceCode,
      digitalHumanId: config.digitalHumanId,
      query: input.query,
      traceId: input.traceId,
      conversationId: input.conversationId,
      turnId: input.turnId,
      stream: input.stream,
      mode: input.mode,
      history: input.history,
    });

    insertBehaviorEvents([{
      id: `${input.traceId || "no-trace"}:server_chat_response_sent:${Date.now()}`,
      sessionId: input.traceId || input.deviceCode,
      conversationId: input.conversationId,
      turnId: input.turnId,
      traceId: input.traceId,
      deviceCode: input.deviceCode,
      digitalHumanId: config.digitalHumanId,
      source: "server",
      category: "llm",
      eventName: "server_chat_response_sent",
      timestampMs: Date.now(),
      elapsedMs: Date.now() - receivedAt,
      payload: {
        hitType: result.hit.type,
        replyLength: result.reply.length,
        requestId: result.requestId || "",
      },
    }]);

    return ok(result);
  } catch (error) {
    const now = Date.now();
    if (error instanceof Error) {
      insertBehaviorEvents([{
        id: `server_chat_error:${now}`,
        sessionId: "server-chat-error",
        source: "server",
        category: "error",
        eventName: "server_chat_error",
        timestampMs: now,
        errorMessage: error.message,
      }]);
    }
    return fail(error, { status: 400 });
  }
}
