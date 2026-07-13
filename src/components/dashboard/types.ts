"use client";

import type { UserRole, UserStatus, UserRecord as UserAccount } from "@/lib/userStore";

export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { message: string } };

export type SectionKey = "overview" | "instances" | "publish" | "debug" | "knowledge" | "users";
export type OverviewTab = "settings" | "interaction" | "qa" | "faq" | "hotword";

export type NavItem = {
  label: string;
  section: SectionKey;
  tab?: OverviewTab;
  title: string;
  desc: string;
  tag?: string;
};

export type DigitalHumanStatus = "draft" | "enabled" | "disabled" | "archived";
export type ConfigVersionStatus = "draft" | "published" | "archived";

export type VideoItem = {
  uri: string;
  displayName: string;
};

export type DigitalHumanRecord = {
  id: string;
  code: string;
  name: string;
  sceneType: string;
  assistantName: string;
  status: DigitalHumanStatus;
  description: string;
  currentConfigVersionId: string | null;
  currentVersionNo?: number | null;
  currentVersionStatus?: ConfigVersionStatus | null;
  currentConfigUpdatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DigitalHumanConfig = {
  onboardingCompleted: boolean;
  dashscopeApiKey: string;
  llmModel: string;
  asrModel: string;
  systemPrompt: string;
  prefixPrompt: string;
  openingMessage: string;
  live2dModelPath: string;
  ttsModel: string;
  ttsVoice: string;
  baseUrl: string;
  knowledgeBaseIndexId: string;
  selectedFixedQaIds: string[];
  wakeWordEnabled: boolean;
  wakeWordText: string;
  videoLoopMode: "playlist" | "single";
  videoOrientation: "landscape" | "portrait";
  videoSingleUri: string;
  weatherCity: string;
  fontScale: number;
  modelScale: number;
  wakeWordHintOffsetDp: number;
  frontCameraRotationDegrees: number;
  frontCameraDiameterDp: number;
  activationCode: string;
  activatedFingerprint: string;
  activationUnlocked: boolean;
  videoItems: VideoItem[];
};

export type DigitalHumanConfigVersion = {
  id: string;
  digitalHumanId: string;
  versionNo: number;
  status: ConfigVersionStatus;
  configHash: string;
  configJson: string;
  dashscopeApiKeyMasked: string;
  activationCodeMasked: string;
  llmModel: string;
  asrModel: string;
  ttsModel: string;
  ttsVoice: string;
  baseUrl: string;
  wakeWordEnabled: boolean;
  wakeWordText: string;
  videoLoopMode: string;
  videoOrientation: string;
  weatherCity: string;
  fontScale: number;
  modelScale: number;
  wakeWordHintOffsetDp: number;
  frontCameraRotationDegrees: number;
  frontCameraDiameterDp: number;
  remark: string;
  createdAt: string;
  updatedAt: string;
  config: DigitalHumanConfig;
};

export type DigitalHumanConfigResponse = {
  digitalHuman: DigitalHumanRecord;
  configVersion: DigitalHumanConfigVersion | null;
  config: DigitalHumanConfig | null;
};

export type InteractionData = {
  openingMessages: string[];
  wakeWords: string[];
  standbyCommands: string[];
  interruptWords: string[];
  fallbackMessages: string[];
};

export type QaItem = {
  id: string;
  question: string;
  answer: string;
  status: "enabled" | "pending" | "disabled";
};

export type QaData = {
  items: QaItem[];
};

export type CreateRoleFormState = {
  id?: string | null;
  name: string;
  code: string;
  sceneType: string;
  assistantName: string;
  status: DigitalHumanStatus;
  description: string;
  live2dModelPath: string;
  systemPrompt: string;
  openingMessages: string[];
  knowledgeBaseIndexId: string;
  wakeWords: string[];
  interruptWords: string[];
  selectedFixedQaIds: string[];
};

export type Live2dModelOption = {
  id: string;
  name: string;
  folderName: string;
  modelPath: string;
  previewUrl: string;
};

export type HotwordGroup = {
  id: string;
  name: string;
  words: string[];
  type: "business" | "campaign" | "sensitive";
  enabled: boolean;
};

export type HotwordData = {
  groups: HotwordGroup[];
};

export type PublishRecord = {
  id: string;
  digitalHumanId: string;
  configVersionId: string | null;
  publishVersion: string;
  publishScope: "all" | "partial";
  summary: string;
  remark: string;
  status: "pending" | "completed";
  createdAt: string;
};

export type ActivationCodeRecord = {
  id: string;
  digitalHumanId: string;
  deviceCode: string;
  deviceName: string;
  activationCode: string;
  activationCodeMasked: string;
  status: "published" | "activated";
  remark: string;
  publishedAt: string;
  activatedAt: string | null;
  appVersion: string;
};

export type DeviceBinding = {
  id: string;
  deviceCode: string;
  deviceName: string;
  bindStatus: "active" | "inactive";
  appVersion: string;
  lastSyncAt: string;
  approvedByUserId?: string | null;
  approvedByUsername?: string;
};

export type DeviceData = {
  devices: DeviceBinding[];
};

export type UserFormState = {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
  status: UserStatus;
};

export type PendingActivationRequest = {
  id: string;
  deviceCode: string;
  deviceName: string;
  appVersion: string;
  activationCode: string;
  activationCodeMasked: string;
  status: "pending" | "approved";
  digitalHumanId: string | null;
  requestedAt: string;
  approvedAt: string | null;
  requestCount: number;
};

export type SettingsFormState = {
  dashscopeApiKey: string;
  baseUrl: string;
  llmModel: string;
  asrModel: string;
  ttsModel: string;
  ttsVoice: string;
  systemPrompt: string;
  prefixPrompt: string;
  openingMessage: string;
  wakeWordEnabled: string;
  wakeWordText: string;
  live2dModelPath: string;
  weatherCity: string;
  videoOrientation: string;
  fontScale: string;
  modelScale: string;
  wakeWordHintOffsetDp: string;
  videoLoopMode: string;
  videoSingleUri: string;
  videoItemsText: string;
  frontCameraRotationDegrees: string;
  frontCameraDiameterDp: string;
  activationCode: string;
  activatedFingerprint: string;
  activationUnlocked: string;
  onboardingCompleted: string;
};

export type LoadingState = Record<string, boolean>;

export const consoleNav: NavItem[] = [
  {
    label: "角色设定",
    section: "instances",
    title: "角色设定",
    desc: "先定义角色形象、人设、知识库、唤醒词和固定问答，再发布绑定到设备。",
    tag: "1",
  },
  {
    label: "数字人概览",
    section: "overview",
    title: "数字人概览",
    desc: "管理数字人运行参数、交互配置、常见问答与热词等内容。",
  },
  {
    label: "发布中心",
    section: "publish",
    title: "发布中心",
    desc: "填写设备编码并选择绑定角色，生成一机一码激活码并完成设备角色绑定。",
  },
  {
    label: "用户管理",
    section: "users",
    title: "用户管理",
    desc: "管理后台登录账号、角色权限和账号启停状态。",
  },
  {
    label: "测试调试",
    section: "debug",
    title: "测试调试",
    desc: "用于验证命中链路、未命中问题、重复播报和兜底策略表现。",
  },
];

export const contentNav: NavItem[] = [
  {
    label: "知识库管理",
    section: "knowledge",
    title: "知识库管理",
    desc: "上传文件、查看解析状态、管理召回策略和知识库更新记录。",
  },
  {
    label: "固定问答",
    section: "overview",
    tab: "qa",
    title: "固定问答",
    desc: "维护高优先级标准答案，适合政务口径和固定流程类问题。",
  },
  {
    label: "常见问题",
    section: "overview",
    tab: "faq",
    title: "常见问题",
    desc: "管理高频 FAQ、统一问法和运营优化建议。",
  },
  {
    label: "热词配置",
    section: "overview",
    tab: "hotword",
    title: "热词配置",
    desc: "配置业务热词、活动热词和敏感词，增强识别与运营引导。",
  },
];

export const ROLE_FIXED_QA_PRESETS: QaItem[] = [
  { id: "preset-id-card-location", question: "身份证在哪里办理？", answer: "请到一楼户政窗口办理。", status: "enabled" },
  { id: "preset-household-proof", question: "户籍证明需要什么材料？", answer: "请携带身份证、户口簿等材料。", status: "enabled" },
  { id: "preset-online-appointment", question: "可以线上预约吗？", answer: "支持线上预约，建议提前一天提交。", status: "enabled" },
  { id: "preset-office-time", question: "今天几点下班？", answer: "请以大厅当天公示时间和窗口实际情况为准。", status: "enabled" },
];

export type { UserAccount, UserRole, UserStatus };
