import { z } from "zod";

export const digitalHumanStatusSchema = z.enum(["draft", "enabled", "disabled", "archived"]);

export const interactionSettingsSchema = z.object({
  openingMessages: z.array(z.string().trim().min(1)).default([]),
  wakeWords: z.array(z.string().trim().min(1)).default([]),
  standbyCommands: z.array(z.string().trim().min(1)).default([]),
  interruptWords: z.array(z.string().trim().min(1)).default([]),
  fallbackMessages: z.array(z.string().trim().min(1)).default([]),
});

export const videoItemSchema = z.object({
  uri: z.string().trim().min(1, "videoItems[].uri 不能为空"),
  displayName: z.string().trim().default(""),
});

export const digitalHumanCreateSchema = z.object({
  code: z.string().trim().min(1, "code 不能为空"),
  name: z.string().trim().min(1, "name 不能为空"),
  sceneType: z.string().trim().default(""),
  assistantName: z.string().trim().default(""),
  description: z.string().trim().default(""),
  status: digitalHumanStatusSchema.default("draft"),
});

export const digitalHumanUpdateSchema = digitalHumanCreateSchema
  .omit({ code: true })
  .extend({
    currentConfigVersionId: z.string().trim().optional(),
  })
  .partial();

export const digitalHumanConfigSchema = z.object({
  onboardingCompleted: z.boolean().optional(),
  dashscopeApiKey: z.string().trim().optional(),
  llmModel: z.string().trim().optional(),
  asrModel: z.string().trim().optional(),
  systemPrompt: z.string().trim().optional(),
  prefixPrompt: z.string().trim().optional(),
  openingMessage: z.string().trim().optional(),
  live2dModelPath: z.string().trim().optional(),
  ttsModel: z.string().trim().optional(),
  ttsVoice: z.string().trim().optional(),
  baseUrl: z.string().trim().optional(),
  knowledgeBaseIndexId: z.string().trim().optional(),
  selectedFixedQaIds: z.array(z.string().trim()).optional(),
  wakeWordEnabled: z.boolean().optional(),
  wakeWordText: z.string().trim().optional(),
  videoLoopMode: z.enum(["playlist", "single"]).optional(),
  videoOrientation: z.enum(["landscape", "portrait"]).optional(),
  videoSingleUri: z.string().trim().optional(),
  weatherCity: z.string().trim().optional(),
  fontScale: z.number().min(0.5).max(3).optional(),
  modelScale: z.number().min(0.5).max(2).optional(),
  wakeWordHintOffsetDp: z.number().int().min(-500).max(500).optional(),
  frontCameraRotationDegrees: z.number().int().refine((value) => [0, 90, 180, 270].includes(value), {
    message: "frontCameraRotationDegrees 只能是 0/90/180/270",
  }).optional(),
  frontCameraDiameterDp: z.number().int().min(0).max(1000).optional(),
  activationCode: z.string().trim().optional(),
  activatedFingerprint: z.string().trim().optional(),
  activationUnlocked: z.boolean().optional(),
  videoItems: z.array(videoItemSchema).optional(),
  remark: z.string().trim().optional(),
});

export const initialQaItemSchema = z.object({
  id: z.string().trim().optional(),
  question: z.string().trim().min(1, "question 不能为空"),
  answer: z.string().trim().min(1, "answer 不能为空"),
  status: z.enum(["enabled", "pending", "disabled"]).default("enabled"),
});

export const digitalHumanCreateWithConfigSchema = digitalHumanCreateSchema.extend({
  initialConfig: digitalHumanConfigSchema.optional(),
  initialInteraction: interactionSettingsSchema.optional(),
  fixedQaItems: z.array(initialQaItemSchema).optional(),
});

export type DigitalHumanCreateInput = z.infer<typeof digitalHumanCreateSchema>;
export type DigitalHumanUpdateInput = z.infer<typeof digitalHumanUpdateSchema>;
export type DigitalHumanConfigInput = z.infer<typeof digitalHumanConfigSchema>;
export type DigitalHumanCreateWithConfigInput = z.infer<typeof digitalHumanCreateWithConfigSchema>;
