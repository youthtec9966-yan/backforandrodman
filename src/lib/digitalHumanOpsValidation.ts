import { z } from "zod";

const stringItemSchema = z.string().trim().min(1);

export const interactionPayloadSchema = z.object({
  openingMessages: z.array(stringItemSchema).default([]),
  wakeWords: z.array(stringItemSchema).default([]),
  standbyCommands: z.array(stringItemSchema).default([]),
  interruptWords: z.array(stringItemSchema).default([]),
  fallbackMessages: z.array(stringItemSchema).default([]),
});

export const qaEntrySchema = z.object({
  id: z.string().trim().optional(),
  question: z.string().trim().min(1, "question 不能为空"),
  answer: z.string().trim().min(1, "answer 不能为空"),
  status: z.enum(["enabled", "pending", "disabled"]).default("enabled"),
});

export const qaPayloadSchema = z.object({
  items: z.array(qaEntrySchema).default([]),
});

export const hotwordGroupSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(1, "name 不能为空"),
  words: z.array(stringItemSchema).default([]),
  type: z.enum(["business", "campaign", "sensitive"]).default("business"),
  enabled: z.boolean().default(true),
});

export const hotwordPayloadSchema = z.object({
  groups: z.array(hotwordGroupSchema).default([]),
});

export const publishCreateSchema = z.object({
  summary: z.string().trim().min(1, "summary 不能为空"),
  publishScope: z.enum(["all", "partial"]).default("all"),
  remark: z.string().trim().default(""),
});

export const deviceBindingSchema = z.object({
  id: z.string().trim().optional(),
  deviceCode: z.string().trim().min(1, "deviceCode 不能为空"),
  deviceName: z.string().trim().min(1, "deviceName 不能为空"),
  bindStatus: z.enum(["active", "inactive"]).default("active"),
  appVersion: z.string().trim().default(""),
  approvedByUserId: z.string().trim().nullable().optional(),
  approvedByUsername: z.string().trim().default("").optional(),
});

export const devicePayloadSchema = z.object({
  devices: z.array(deviceBindingSchema).default([]),
});

export const deviceDeleteSchema = z.object({
  deviceCode: z.string().trim().min(1, "deviceCode 不能为空"),
});

export const activationCodeCreateSchema = z.object({
  deviceCode: z.string().trim().min(1, "deviceCode 不能为空"),
  deviceName: z.string().trim().default(""),
  remark: z.string().trim().default(""),
});

export const activationCodeVerifySchema = z.object({
  activationCode: z.string().trim().min(1, "activationCode 不能为空"),
  deviceCode: z.string().trim().min(1, "deviceCode 不能为空"),
  deviceName: z.string().trim().default(""),
  appVersion: z.string().trim().default(""),
});

export const appDeviceConfigSchema = z.object({
  deviceCode: z.string().trim().min(1, "deviceCode 不能为空"),
});

export const appActivationRequestSchema = z.object({
  deviceCode: z.string().trim().min(1, "deviceCode 不能为空"),
  deviceName: z.string().trim().default(""),
  appVersion: z.string().trim().default(""),
});

export const pendingActivationApproveSchema = z.object({
  digitalHumanId: z.string().trim().min(1, "digitalHumanId 不能为空"),
});

export type InteractionPayload = z.infer<typeof interactionPayloadSchema>;
export type QaPayload = z.infer<typeof qaPayloadSchema>;
export type HotwordPayload = z.infer<typeof hotwordPayloadSchema>;
export type PublishCreatePayload = z.infer<typeof publishCreateSchema>;
export type DevicePayload = z.infer<typeof devicePayloadSchema>;
export type DeviceDeletePayload = z.infer<typeof deviceDeleteSchema>;
export type ActivationCodeCreatePayload = z.infer<typeof activationCodeCreateSchema>;
export type ActivationCodeVerifyPayload = z.infer<typeof activationCodeVerifySchema>;
export type AppDeviceConfigPayload = z.infer<typeof appDeviceConfigSchema>;
export type AppActivationRequestPayload = z.infer<typeof appActivationRequestSchema>;
export type PendingActivationApprovePayload = z.infer<typeof pendingActivationApproveSchema>;
