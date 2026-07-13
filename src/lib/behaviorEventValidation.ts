import { z } from "zod";

export const behaviorEventSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  conversationId: z.string().optional(),
  turnId: z.string().optional(),
  traceId: z.string().optional(),
  deviceCode: z.string().optional(),
  digitalHumanId: z.string().optional(),
  source: z.enum(["android", "server", "webview"]),
  category: z.string().min(1),
  eventName: z.string().min(1),
  timestampMs: z.number().int().nonnegative(),
  elapsedMs: z.number().int().nonnegative().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  appVersion: z.string().optional(),
  networkType: z.string().optional(),
});

export const behaviorEventBatchSchema = z.object({
  events: z.array(behaviorEventSchema).min(1).max(200),
});

export type BehaviorEventInput = z.infer<typeof behaviorEventSchema>;
export type BehaviorEventBatchInput = z.infer<typeof behaviorEventBatchSchema>;
